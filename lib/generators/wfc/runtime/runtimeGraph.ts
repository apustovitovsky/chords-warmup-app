import type { RuntimeEdge } from "./runtimeEdge";
import type { RuntimeNode } from "./runtimeNode";

export class RuntimeGraph {
    constructor(
        readonly nodes: RuntimeNode[],
        readonly edges: RuntimeEdge[][],
        readonly order: number[],
        readonly moduleCapacity: number
    ) { }

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
