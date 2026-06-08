import { ModuleSet } from "../runtime/moduleSet";
import { RuntimeEdge, type EdgeTransitionData } from "../runtime/runtimeEdge";
import { RuntimeGraph } from "../runtime/runtimeGraph";
import { RuntimeNode } from "../runtime/runtimeNode";
import type {
    PatternCollection,
} from "./patternDefinition";
import {
    LayoutBuilder,
    type Layout,
} from "./layoutBuilder";
import { DomainBuilder, type Domain, type PatternModule } from "./domainBuilder";

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
    compile(
        pass: PatternCollection<TValue>,
        parent: TValue[],
        options: PatternResolverOptions
    ): CompiledPattern<TValue> {
        const domain = new DomainBuilder<TValue>().build(pass);
        const parentDomainIds = parent.map((value) =>
            domain.getDomainId(value)
        );
        const layout = new LayoutBuilder(parentDomainIds).build(options);

        const slotModules = this.createSlotModules(
            domain,
            layout
        );
        const adjacency = this.createAdjacency(slotModules.length);
        const edges = this.createEdges(domain, slotModules, adjacency);
        const nodes = slotModules.map((modules, nodeIndex) => new RuntimeNode(
            modules,
            edges[nodeIndex].length
        ));
        const runtimeGraph = new RuntimeGraph(
            nodes,
            edges,
            nodes.map((_, nodeIndex) => nodeIndex),
            domain.modules.length
        );

        this.initializeModuleHealth(runtimeGraph);

        return {
            pass,
            runtimeGraph,
            modules: domain.modules,
        };
    }

    private createSlotModules(
        domain: Domain<TValue>,
        layout: Layout
    ): ModuleSet[] {
        return Array.from(
            { length: layout.items.length },
            (_, slotIndex) => {
                const modules = new ModuleSet(domain.modules.length);

                for (const domainId of layout.items[slotIndex]) {
                    for (const moduleId of domain.moduleIdsByDomainId[domainId]) {
                        modules.add(moduleId);
                    }
                }

                if (modules.empty) {
                    throw new Error(`Pattern pass produced empty domain for slot "${slotIndex}".`);
                }

                return modules;
            }
        );
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
        domain: Domain<TValue>,
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
                    domain,
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
        domain: Domain<TValue>,
        sourceModules: ModuleSet,
        targetModules: ModuleSet
    ): EdgeTransitionData {
        const modules = this.createEmptyModuleSets(domain.modules.length);
        const weights = this.createEmptyTransitionWeights(domain.modules.length);

        for (const moduleId of sourceModules) {
            const supported = modules[moduleId];
            const moduleWeights = weights[moduleId];

            for (const targetModuleId of targetModules) {
                const weight = domain.getTransitionWeight(
                    moduleId,
                    targetModuleId
                );

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

    private createEmptyModuleSets(moduleCount: number): ModuleSet[] {
        const result: ModuleSet[] = [];

        for (let moduleId = 0; moduleId < moduleCount; moduleId++) {
            result[moduleId] = new ModuleSet(moduleCount);
        }

        return result;
    }

    private createEmptyTransitionWeights(moduleCount: number): number[][] {
        const result: number[][] = [];

        for (let moduleId = 0; moduleId < moduleCount; moduleId++) {
            result[moduleId] = new Array(moduleCount).fill(0);
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
}
