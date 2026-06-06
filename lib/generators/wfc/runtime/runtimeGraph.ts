import type { ModuleSet } from "./moduleSet";
import type { RuntimeNode } from "./runtimeNode";

export class RuntimeGraph {
    constructor(
        readonly nodes: RuntimeNode[],
        readonly edges: RuntimeEdge[][],
        readonly order: number[],
        readonly moduleCapacity: number
    ) { }

    calculateModuleTransitionWeight(nodeIndex: number, moduleId: number): number {
        let result = 0;

        for (const edge of this.edges[nodeIndex]) {
            const targetNode = this.nodes[edge.targetNodeIndex];

            for (const targetModuleId of targetNode.modules) {
                result += edge.getTransitionWeight(moduleId, targetModuleId);
            }
        }

        return result;
    }

    calculateModuleWeights(nodeIndex: number): Map<number, number> {
        const result = new Map<number, number>();
        const node = this.nodes[nodeIndex];

        for (const moduleId of node.modules) {
            result.set(
                moduleId,
                this.calculateModuleTransitionWeight(nodeIndex, moduleId)
            );
        }

        return result;
    }

    getAffectedNodeIndices(nodeIndices: Iterable<number>): Set<number> {
        const result = new Set<number>();

        for (const nodeIndex of nodeIndices) {
            result.add(nodeIndex);

            for (const edge of this.edges[nodeIndex]) {
                result.add(edge.targetNodeIndex);
            }
        }

        return result;
    }
}

export interface EdgeTransitionData {
    modules: ModuleSet[];
    weights: number[][];
}

export class RuntimeEdge {
    constructor(
        readonly targetNodeIndex: number,
        readonly reverseEdgeIndex: number,
        readonly transitions: EdgeTransitionData
    ) { }

    getSupportedModules(moduleId: number): ModuleSet {
        return this.transitions.modules[moduleId];
    }

    getTransitionWeight(fromModuleId: number, toModuleId: number): number {
        return this.transitions.weights[fromModuleId][toModuleId];
    }
}
