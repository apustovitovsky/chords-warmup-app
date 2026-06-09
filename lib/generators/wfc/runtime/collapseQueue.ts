import { PriorityQueue } from "./helpers/priorityQueue";
import type { RuntimeGraph } from "./runtimeGraph";
import type { RuntimeNode } from "./runtimeNode";

interface CollapseQueueEntry {
    nodeIndex: number;
    orderIndex: number;
    entropy: number;
    version: number;
}

export class CollapseQueue {
    private readonly entropyQueue = new PriorityQueue<CollapseQueueEntry>(
        compareCollapseQueueEntries
    );
    private readonly versions: number[];
    private readonly orderIndexByNodeIndex: number[];

    constructor(private readonly runtimeGraph: RuntimeGraph) {
        this.versions = new Array(this.runtimeGraph.nodes.length).fill(0);
        this.orderIndexByNodeIndex = new Array(this.runtimeGraph.nodes.length).fill(0);

        for (
            let orderIndex = 0;
            orderIndex < this.runtimeGraph.order.length;
            orderIndex++
        ) {
            this.orderIndexByNodeIndex[this.runtimeGraph.order[orderIndex]] = orderIndex;
        }
    }

    initialize(): void {
        for (const nodeIndex of this.runtimeGraph.order) {
            this.update(nodeIndex);
        }
    }

    updateMany(nodeIndices: Iterable<number>): void {
        for (const nodeIndex of this.runtimeGraph.getAffectedNodeIndices(nodeIndices)) {
            this.update(nodeIndex);
        }
    }

    update(nodeIndex: number): void {
        const node = this.runtimeGraph.nodes[nodeIndex];
        const version = ++this.versions[nodeIndex];

        if (node.moduleCount <= 1) {
            return;
        }

        const entropy = this.calculateEntropy(node);

        this.entropyQueue.push({
            nodeIndex,
            orderIndex: this.orderIndexByNodeIndex[nodeIndex],
            entropy,
            version,
        });
    }

    nextNodeIndex(): number | null {
        let entry = this.entropyQueue.pop();

        while (entry !== null) {
            const node = this.runtimeGraph.nodes[entry.nodeIndex];

            if (
                entry.version === this.versions[entry.nodeIndex] &&
                node.moduleCount > 1
            ) {
                return entry.nodeIndex;
            }

            entry = this.entropyQueue.pop();
        }

        return null;
    }

    private calculateEntropy(node: RuntimeNode): number {
        let sumWeight = 0;
        let sumWeightLogWeight = 0;

        for (const moduleId of node.modules) {
            const weight = node.moduleWeights[moduleId];

            if (weight <= 0) {
                continue;
            }

            sumWeight += weight;
            sumWeightLogWeight += weight * Math.log(weight);
        }

        if (sumWeight <= 0) {
            return Math.log(node.moduleCount);
        }

        return Math.log(sumWeight) - sumWeightLogWeight / sumWeight;
    }

}

function compareCollapseQueueEntries(
    lhs: CollapseQueueEntry,
    rhs: CollapseQueueEntry
): number {
    if (lhs.entropy !== rhs.entropy) {
        return lhs.entropy - rhs.entropy;
    }

    if (lhs.orderIndex !== rhs.orderIndex) {
        return lhs.orderIndex - rhs.orderIndex;
    }

    return lhs.nodeIndex - rhs.nodeIndex;
}
