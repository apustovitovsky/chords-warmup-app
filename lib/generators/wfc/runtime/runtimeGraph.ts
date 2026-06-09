import type { RuntimeEdge } from "./runtimeEdge";
import type { RuntimeNode } from "./runtimeNode";

export class RuntimeGraph {
    constructor(
        readonly nodes: RuntimeNode[],
        readonly edges: RuntimeEdge[][],
        readonly order: number[],
        readonly moduleCapacity: number
    ) { }

    calculateModuleHealthWeight(nodeIndex: number, moduleId: number): number {
        let result = 0;
        const node = this.nodes[nodeIndex];

        for (let edgeIndex = 0; edgeIndex < this.edges[nodeIndex].length; edgeIndex++) {
            result += node.moduleHealth[edgeIndex][moduleId];
        }

        return result;
    }

    calculateModuleWeights(nodeIndex: number): Map<number, number> {
        const result = new Map<number, number>();
        const node = this.nodes[nodeIndex];

        for (const moduleId of node.modules) {
            result.set(
                moduleId,
                this.calculateModuleHealthWeight(nodeIndex, moduleId)
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
