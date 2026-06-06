import { ModuleSet } from "../runtime/moduleSet";
import { RuntimeEdge, type EdgeTransitionData } from "../runtime/runtimeEdge";
import { RuntimeGraph } from "../runtime/runtimeGraph";
import { RuntimeNode } from "../runtime/runtimeNode";
import type {
    CollapsedPass,
    CollapsedPassItem,
    PatternDefinition,
    PatternItem,
    PatternPass,
} from "./pass";

export interface PatternModule<TValue> {
    id: number;
    value: TValue;
    valueId: number;
    size: number;
    label: string;
}

interface SlotDraft {
    modules: ModuleSet;
    adjacentNodeIndices: Array<number | null>;
}

interface EdgeDraft {
    targetNodeIndex: number;
    transitions: EdgeTransitionData;
}

export interface CompiledPatternPass<TValue = string> {
    pass: PatternPass<TValue>;
    runtimeGraph: RuntimeGraph;
    modules: PatternModule<TValue>[];
}

export function compilePatternPass<TValue = string>(
    pass: PatternPass<TValue>,
    parent: CollapsedPass<TValue> | null = null
): CompiledPatternPass<TValue> {
    return new PatternPassCompiler<TValue>().compile(pass, parent);
}

export function createCollapsedPass<TValue = string>(
    compiledPass: CompiledPatternPass<TValue>
): CollapsedPass<TValue> {
    const items: CollapsedPassItem<TValue>[] = [];
    let startIndex = 0;

    for (const node of compiledPass.runtimeGraph.nodes) {
        const moduleId = node.resolvedModuleId;

        if (moduleId === null) {
            throw new Error(
                `Cannot create collapsed pass "${compiledPass.pass.name}" from unresolved runtime graph.`
            );
        }

        const module = compiledPass.modules[moduleId];
        const endIndex = startIndex + module.size;

        items.push({
            value: module.value,
            size: module.size,
            startIndex,
            endIndex,
        });
        startIndex = endIndex;
    }

    return {
        name: compiledPass.pass.name,
        items,
    };
}

class PatternPassCompiler<TValue> {
    private readonly valueIdByKey = new Map<string, number>();
    private readonly moduleByKey = new Map<string, PatternModule<TValue>>();
    private readonly modules: PatternModule<TValue>[] = [];
    private readonly valueTransitionWeights = new Map<number, Map<number, number>>();

    compile(
        pass: PatternPass<TValue>,
        parent: CollapsedPass<TValue> | null
    ): CompiledPatternPass<TValue> {
        const baseSlotModules = this.createBaseSlotModules(pass, parent);
        const drafts = this.createSlotDrafts(
            baseSlotModules,
            pass.domainOverlap ?? 0
        );
        const edgeDrafts = this.createEdgeDrafts(drafts);
        const edges = this.createEdges(edgeDrafts);
        const nodes = drafts.map((draft, nodeIndex) => new RuntimeNode(
            draft.modules,
            edges[nodeIndex].length
        ));
        const runtimeGraph = new RuntimeGraph(
            nodes,
            edges,
            nodes.map((_, nodeIndex) => nodeIndex),
            this.modules.length
        );

        this.initializeModuleHealth(runtimeGraph);

        return {
            pass,
            runtimeGraph,
            modules: this.modules,
        };
    }

    private createBaseSlotModules(
        pass: PatternPass<TValue>,
        parent: CollapsedPass<TValue> | null
    ): ModuleSet[] {
        this.initializeTransitions(pass.patterns);

        if (parent === null) {
            return this.createRootBaseSlotModules(pass);
        }

        return this.createChildBaseSlotModules(pass, parent);
    }

    private createRootBaseSlotModules(pass: PatternPass<TValue>): ModuleSet[] {
        const slotCount = pass.targetSize ?? Math.max(
            ...pass.patterns.map((pattern) => pattern.values.length)
        );
        const pendingModules: number[][] = Array.from(
            { length: slotCount },
            () => []
        );

        for (const pattern of pass.patterns) {
            if (pattern.parentValues !== null) {
                continue;
            }

            for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
                const item = pattern.values[slotIndex];

                if (!item) {
                    continue;
                }

                pendingModules[slotIndex].push(
                    this.getModule(pattern, item).id
                );
            }
        }

        return this.createModuleSets(pendingModules);
    }

    private createChildBaseSlotModules(
        pass: PatternPass<TValue>,
        parent: CollapsedPass<TValue>
    ): ModuleSet[] {
        const pendingModules: number[][] = [];

        for (const parentItem of parent.items) {
            const patterns = pass.patterns.filter((pattern) =>
                pattern.parentValues?.some((value) =>
                    this.getValueKey(value) === this.getValueKey(parentItem.value)
                )
            );

            for (let offset = 0; offset < parentItem.size; offset++) {
                const moduleIds: number[] = [];

                for (const pattern of patterns) {
                    const item = pattern.values[offset];

                    if (!item) {
                        continue;
                    }

                    moduleIds.push(this.getModule(pattern, item).id);
                }

                pendingModules.push(moduleIds);
            }
        }

        return this.createModuleSets(pendingModules);
    }

    private createModuleSets(moduleIdsBySlot: number[][]): ModuleSet[] {
        const capacity = this.modules.length;

        return moduleIdsBySlot.map((moduleIds, slotIndex) => {
            const modules = ModuleSet.fromIds(capacity, moduleIds);

            if (modules.empty) {
                throw new Error(`Pattern pass produced empty domain for slot "${slotIndex}".`);
            }

            return modules;
        });
    }

    private createSlotDrafts(
        baseSlotModules: ModuleSet[],
        domainOverlap: number
    ): SlotDraft[] {
        return baseSlotModules.map((_, slotIndex) => ({
            modules: this.createDomainModules(
                baseSlotModules,
                slotIndex,
                domainOverlap
            ),
            adjacentNodeIndices: [
                baseSlotModules[slotIndex - 1] ? slotIndex - 1 : null,
                baseSlotModules[slotIndex + 1] ? slotIndex + 1 : null,
            ],
        }));
    }

    private createDomainModules(
        baseSlotModules: ModuleSet[],
        slotIndex: number,
        domainOverlap: number
    ): ModuleSet {
        const result = new ModuleSet(this.modules.length);
        const startIndex = Math.max(0, slotIndex - domainOverlap);
        const endIndex = Math.min(
            baseSlotModules.length - 1,
            slotIndex + domainOverlap
        );

        for (let index = startIndex; index <= endIndex; index++) {
            result.addSet(baseSlotModules[index]);
        }

        return result;
    }

    private createEdgeDrafts(drafts: SlotDraft[]): EdgeDraft[][] {
        return drafts.map((draft) => {
            const edgeDrafts: EdgeDraft[] = [];

            for (const targetNodeIndex of draft.adjacentNodeIndices) {
                if (targetNodeIndex === null) {
                    continue;
                }

                edgeDrafts.push({
                    targetNodeIndex,
                    transitions: this.createEdgeTransitionData(
                        draft,
                        drafts[targetNodeIndex]
                    ),
                });
            }

            return edgeDrafts;
        });
    }

    private createEdges(edgeDrafts: EdgeDraft[][]): RuntimeEdge[][] {
        return edgeDrafts.map((nodeEdgeDrafts, sourceNodeIndex) =>
            nodeEdgeDrafts.map((edgeDraft) => new RuntimeEdge(
                edgeDraft.targetNodeIndex,
                this.getReverseEdgeIndex(
                    edgeDrafts,
                    sourceNodeIndex,
                    edgeDraft.targetNodeIndex
                ),
                edgeDraft.transitions
            ))
        );
    }

    private getReverseEdgeIndex(
        edgeDrafts: EdgeDraft[][],
        sourceNodeIndex: number,
        targetNodeIndex: number
    ): number {
        const reverseEdgeIndex = edgeDrafts[targetNodeIndex].findIndex(
            (edgeDraft) => edgeDraft.targetNodeIndex === sourceNodeIndex
        );

        if (reverseEdgeIndex < 0) {
            throw new Error(
                `Runtime edge "${sourceNodeIndex}" -> "${targetNodeIndex}" has no reverse edge.`
            );
        }

        return reverseEdgeIndex;
    }

    private createEdgeTransitionData(
        source: SlotDraft,
        target: SlotDraft
    ): EdgeTransitionData {
        const modules = this.createEmptyModuleSets();
        const weights = this.createEmptyTransitionWeights();

        for (const moduleId of source.modules) {
            const supported = modules[moduleId];
            const moduleWeights = weights[moduleId];

            for (const targetModuleId of target.modules) {
                const weight = this.getTransitionWeight(moduleId, targetModuleId);

                if (weight > 0) {
                    supported.add(targetModuleId);
                    moduleWeights[targetModuleId] = weight;
                }
            }
        }

        return {
            modules,
            weights,
        };
    }

    private createEmptyModuleSets(): ModuleSet[] {
        const result: ModuleSet[] = [];

        for (let moduleId = 0; moduleId < this.modules.length; moduleId++) {
            result[moduleId] = new ModuleSet(this.modules.length);
        }

        return result;
    }

    private createEmptyTransitionWeights(): number[][] {
        const result: number[][] = [];

        for (let moduleId = 0; moduleId < this.modules.length; moduleId++) {
            result[moduleId] = new Array(this.modules.length).fill(0);
        }

        return result;
    }

    private initializeModuleHealth(runtimeGraph: RuntimeGraph): void {
        for (let nodeIndex = 0; nodeIndex < runtimeGraph.nodes.length; nodeIndex++) {
            const node = runtimeGraph.nodes[nodeIndex];
            const edges = runtimeGraph.edges[nodeIndex];

            for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
                const edge = edges[edgeIndex];
                const targetNode = runtimeGraph.nodes[edge.targetNodeIndex];
                const reverseEdge =
                    runtimeGraph.edges[edge.targetNodeIndex][edge.reverseEdgeIndex];

                for (const moduleId of node.modules) {
                    let health = 0;

                    for (const targetModuleId of targetNode.modules) {
                        if (reverseEdge.getSupportedModules(targetModuleId).contains(moduleId)) {
                            health++;
                        }
                    }

                    node.moduleHealth[edgeIndex][moduleId] = health;
                }
            }
        }
    }

    private initializeTransitions(patterns: PatternDefinition<TValue>[]): void {
        for (const pattern of patterns) {
            for (let index = 0; index < pattern.values.length - 1; index++) {
                const fromValueId = this.getValueId(pattern.values[index].value);
                const toValueId = this.getValueId(pattern.values[index + 1].value);

                this.addTransitionWeight(fromValueId, toValueId);
                this.addTransitionWeight(toValueId, fromValueId);
            }
        }
    }

    private addTransitionWeight(fromValueId: number, toValueId: number): void {
        let weights = this.valueTransitionWeights.get(fromValueId);

        if (!weights) {
            weights = new Map();
            this.valueTransitionWeights.set(fromValueId, weights);
        }

        weights.set(toValueId, (weights.get(toValueId) ?? 0) + 1);
    }

    private getTransitionWeight(moduleId: number, targetModuleId: number): number {
        const fromValueId = this.modules[moduleId].valueId;
        const toValueId = this.modules[targetModuleId].valueId;

        return this.valueTransitionWeights.get(fromValueId)?.get(toValueId) ?? 0;
    }

    private getModule(
        pattern: PatternDefinition<TValue>,
        item: PatternItem<TValue>
    ): PatternModule<TValue> {
        const parentKey = this.getParentKey(pattern.parentValues);
        const valueKey = this.getValueKey(item.value);
        const moduleKey = `${parentKey}\u0000${valueKey}`;
        let module = this.moduleByKey.get(moduleKey);

        if (module) {
            return module;
        }

        module = {
            id: this.modules.length,
            value: item.value,
            valueId: this.getValueId(item.value),
            size: item.size,
            label: valueKey,
        };
        this.modules.push(module);
        this.moduleByKey.set(moduleKey, module);

        return module;
    }

    private getValueId(value: TValue): number {
        const key = this.getValueKey(value);
        let valueId = this.valueIdByKey.get(key);

        if (valueId === undefined) {
            valueId = this.valueIdByKey.size;
            this.valueIdByKey.set(key, valueId);
        }

        return valueId;
    }

    private getParentKey(parentValues: TValue[] | null): string {
        if (parentValues === null) {
            return "root";
        }

        return parentValues
            .map((value) => this.getValueKey(value))
            .sort()
            .join("|");
    }

    private getValueKey(value: TValue): string {
        return String(value);
    }
}
