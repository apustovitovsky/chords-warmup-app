import { ModuleSet } from "../runtime/moduleSet";
import { RuntimeEdge } from "../runtime/runtimeEdge";
import { RuntimeGraph } from "../runtime/runtimeGraph";
import { RuntimeNode } from "../runtime/runtimeNode";
import type { Domain } from "./domainBuilder";
import type { Layout } from "./layoutBuilder";

export class GraphBuilder {
    build(layout: Layout, domain: Domain): RuntimeGraph {
        const nodeModules = this.createNodeModules(domain, layout);
        const adjacency = this.createAdjacency(nodeModules.length);
        const edges = this.createEdges(domain, nodeModules, adjacency);
        const nodes = nodeModules.map((modules, nodeIndex) => new RuntimeNode(
            modules,
            edges[nodeIndex].length
        ));
        const graph = new RuntimeGraph(
            nodes,
            edges,
            nodes.map((_, nodeIndex) => nodeIndex),
            domain.moduleCapacity
        );

        this.initializeModuleHealth(graph);

        return graph;
    }

    private createNodeModules(
        domain: Domain,
        layout: Layout
    ): ModuleSet[] {
        return Array.from(
            { length: layout.items.length },
            (_, nodeIndex) => {
                const modules = new ModuleSet(domain.moduleCapacity);

                for (const domainId of layout.items[nodeIndex]) {
                    modules.addSet(domain.modulesByDomainId[domainId]);
                }

                if (modules.empty) {
                    throw new Error(`Pattern pass produced empty domain for node "${nodeIndex}".`);
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
        domain: Domain,
        nodeModules: ModuleSet[],
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
                this.createSupportedModules(
                    domain,
                    nodeModules[sourceNodeIndex],
                    nodeModules[targetNodeIndex]
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

    private createSupportedModules(
        domain: Domain,
        sourceModules: ModuleSet,
        targetModules: ModuleSet
    ): ModuleSet[] {
        const modules = this.createEmptyModuleSets(domain.moduleCapacity);

        for (const moduleId of sourceModules) {
            const supported = modules[moduleId];
            supported.addSet(domain.supportsByModuleId[moduleId]);
            supported.enforce(targetModules);
        }

        return modules;
    }

    private createEmptyModuleSets(moduleCapacity: number): ModuleSet[] {
        const result: ModuleSet[] = [];

        for (let moduleId = 0; moduleId < moduleCapacity; moduleId++) {
            result[moduleId] = new ModuleSet(moduleCapacity);
        }

        return result;
    }

    private initializeModuleHealth(graph: RuntimeGraph): void {
        for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex++) {
            const node = graph.nodes[nodeIndex];
            const edges = graph.edges[nodeIndex];

            for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
                const edge = edges[edgeIndex];
                const targetNode = graph.nodes[edge.targetNodeIndex];
                const reverseEdge =
                    graph.edges[edge.targetNodeIndex][edge.reverseEdgeIndex];

                for (const moduleId of node.modules) {
                    let health = 0;

                    for (const targetModuleId of targetNode.modules) {
                        if (reverseEdge.getSupportedModules(targetModuleId).contains(moduleId)) {
                            health++;
                        }
                    }

                    node.setModuleHealth(edgeIndex, moduleId, health);
                }
            }
        }
    }
}
