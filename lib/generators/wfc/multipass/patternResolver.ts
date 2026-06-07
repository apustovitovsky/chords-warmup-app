import { ModuleSet } from "../runtime/moduleSet";
import { RuntimeEdge, type EdgeTransitionData } from "../runtime/runtimeEdge";
import { RuntimeGraph } from "../runtime/runtimeGraph";
import { RuntimeNode } from "../runtime/runtimeNode";
import type {
    PatternCollection,
    PatternDefinition
} from "./patternDefinition";
import {
    LayoutBuilder,
    type Layout,
} from "./layoutBuilder";

export interface PatternModule<TValue> {
    id: number;
    value: TValue;
    valueId: number;
    label: string;
}

export interface PatternResolverOptions {
    resolution: number;
    overlap: number;
}

export interface CompiledPattern<TValue = string> {
    pass: PatternCollection<TValue>;
    runtimeGraph: RuntimeGraph;
    modules: PatternModule<TValue>[];
}

export function compilePatternPass<TValue = string>(
    pass: PatternCollection<TValue>,
    parent: TValue[],
    options: PatternResolverOptions
): CompiledPattern<TValue> {
    return new PatternResolver<TValue>().compile(pass, parent, options);
}

export class PatternResolver<TValue = string> {
    private readonly valueIdByKey = new Map<string, number>();
    private readonly moduleByKey = new Map<string, PatternModule<TValue>>();
    private readonly modules: PatternModule<TValue>[] = [];
    private readonly valueTransitionWeights = new Map<number, Map<number, number>>();
    private nextValueId = 0;

    compile(
        pass: PatternCollection<TValue>,
        parent: TValue[],
        options: PatternResolverOptions
    ): CompiledPattern<TValue> {
        this.initializeTransitions(pass.patterns);
        const layout = new LayoutBuilder(parent).build(options);

        const slotModules = this.createSlotModules(
            pass,
            layout
        );
        const adjacency = this.createAdjacency(slotModules.length);
        const edges = this.createEdges(slotModules, adjacency);
        const nodes = slotModules.map((modules, nodeIndex) => new RuntimeNode(
            modules,
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

    private createSlotModules(
        pass: PatternCollection<TValue>,
        layout: Layout<TValue>
    ): ModuleSet[] {
        const moduleIdsBySlot = Array.from(
            { length: layout.items.length },
            () => [] as number[]
        );

        for (let slotIndex = 0; slotIndex < layout.items.length; slotIndex++) {
            for (const parentValue of layout.items[slotIndex]) {
                for (const pattern of this.getPatternsForParentValue(
                    pass,
                    parentValue
                )) {
                    for (const value of pattern.values) {
                        moduleIdsBySlot[slotIndex].push(
                            this.getModule(pattern, value).id
                        );
                    }
                }
            }
        }

        return this.createModuleSets(moduleIdsBySlot);
    }

    private getPatternsForParentValue(
        pass: PatternCollection<TValue>,
        parentValue: TValue
    ): PatternDefinition<TValue>[] {
        const parentKey = this.getValueKey(parentValue);

        return pass.patterns.filter((pattern) =>
            pattern.parentValues.some((value) =>
                this.getValueKey(value) === parentKey
            )
        );
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

    private createAdjacency(nodeCount: number): number[][] {
        return Array.from({ length: nodeCount }, (_, nodeIndex) => {
            const adjacentNodeIndices: number[] = [];

            if (nodeIndex > 0) {
                adjacentNodeIndices.push(nodeIndex - 1);
            }

            if (nodeIndex < nodeCount - 1) {
                adjacentNodeIndices.push(nodeIndex + 1);
            }

            return adjacentNodeIndices;
        });
    }

    private createEdges(
        slotModules: ModuleSet[],
        adjacency: number[][]
    ): RuntimeEdge[][] {
        return adjacency.map((targetNodeIndices, sourceNodeIndex) =>
            targetNodeIndices.map((targetNodeIndex) => new RuntimeEdge(
                targetNodeIndex,
                this.getReverseEdgeIndex(
                    adjacency,
                    sourceNodeIndex,
                    targetNodeIndex
                ),
                this.createEdgeTransitionData(
                    slotModules[sourceNodeIndex],
                    slotModules[targetNodeIndex]
                )
            ))
        );
    }

    private getReverseEdgeIndex(
        adjacency: number[][],
        sourceNodeIndex: number,
        targetNodeIndex: number
    ): number {
        const reverseEdgeIndex = adjacency[targetNodeIndex].indexOf(sourceNodeIndex);

        if (reverseEdgeIndex < 0) {
            throw new Error(
                `Runtime edge "${sourceNodeIndex}" -> "${targetNodeIndex}" has no reverse edge.`
            );
        }

        return reverseEdgeIndex;
    }

    private createEdgeTransitionData(
        sourceModules: ModuleSet,
        targetModules: ModuleSet
    ): EdgeTransitionData {
        const modules = this.createEmptyModuleSets();
        const weights = this.createEmptyTransitionWeights();

        for (const moduleId of sourceModules) {
            const supported = modules[moduleId];
            const moduleWeights = weights[moduleId];

            for (const targetModuleId of targetModules) {
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
                const fromValueId = this.getValueId(pattern.values[index]);
                const toValueId = this.getValueId(pattern.values[index + 1]);

                this.addTransitionWeight(fromValueId, toValueId);
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
        value: TValue
    ): PatternModule<TValue> {
        const parentKey = this.getParentKey(pattern.parentValues);
        const valueKey = this.getValueKey(value);
        const moduleKey = `${parentKey}\u0000${valueKey}`;
        let module = this.moduleByKey.get(moduleKey);

        if (module) {
            return module;
        }

        module = {
            id: this.modules.length,
            value,
            valueId: this.getValueId(value),
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
            valueId = this.nextValueId;
            this.nextValueId++;
            this.valueIdByKey.set(key, valueId);
        }

        return valueId;
    }

    private getParentKey(parentValues: TValue[]): string {
        return parentValues
            .map((value) => this.getValueKey(value))
            .sort()
            .join("|");
    }

    private getValueKey(value: TValue): string {
        return String(value);
    }
}
