import type { RuntimeNode } from "./runtimeNode";

export class RuntimeGraph {
    constructor(
        readonly nodes: RuntimeNode[],
        readonly order: number[],
        readonly moduleCapacity: number
    ) { }

    getAffectedNodeIndices(nodeIndices: Iterable<number>): Set<number> {
        const result = new Set<number>();

        for (const nodeIndex of nodeIndices) {
            result.add(nodeIndex);

            for (const neighbor of this.nodes[nodeIndex].neighbors) {
                if (neighbor) {
                    result.add(neighbor.nodeIndex);
                }
            }
        }

        return result;
    }
}
