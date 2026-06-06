import { PriorityQueue } from "./helpers/priorityQueue";
import type { RuntimeGraph } from "./runtimeGraph";
import type { RuntimeNode } from "./runtimeNode";
import { calculateModuleTransitionWeight } from "./transitionWeight";

interface CollapseQueueEntry {
    nodeIndex: number;
    orderIndex: number;
    entropy: number;
    version: number;
    moduleWeights: Map<number, number>;
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
        for (const nodeIndex of this.getAffectedNodeIndices(nodeIndices)) {
            this.update(nodeIndex);
        }
    }

    update(nodeIndex: number): void {
        const node = this.runtimeGraph.nodes[nodeIndex];
        const version = ++this.versions[nodeIndex];

        if (node.moduleCount <= 1) {
            return;
        }

        const moduleWeights = this.calculateModuleWeights(nodeIndex);
        const entropy = this.calculateEntropy(node, moduleWeights);

        this.entropyQueue.push({
            nodeIndex,
            orderIndex: this.orderIndexByNodeIndex[nodeIndex],
            entropy,
            version,
            moduleWeights,
        });
    }

    private calculateModuleWeights(nodeIndex: number): Map<number, number> {
        const result = new Map<number, number>();
        const node = this.runtimeGraph.nodes[nodeIndex];

        for (const moduleId of node.modules) {
            result.set(
                moduleId,
                calculateModuleTransitionWeight(this.runtimeGraph, nodeIndex, moduleId)
            );
        }

        return result;
    }

    nextCandidate(): {
        nodeIndex: number,
        moduleWeights: Map<number, number>,
    } | null {
        let entry = this.entropyQueue.pop();

        while (entry !== null) {
            const node = this.runtimeGraph.nodes[entry.nodeIndex];

            if (
                entry.version === this.versions[entry.nodeIndex] &&
                node.moduleCount > 1
            ) {
                return {
                    nodeIndex: entry.nodeIndex,
                    moduleWeights: entry.moduleWeights,
                };
            }

            entry = this.entropyQueue.pop();
        }

        return null;
    }

    private calculateEntropy(
        node: RuntimeNode,
        moduleWeights: Map<number, number>
    ): number {
        let sumWeight = 0;
        let sumWeightLogWeight = 0;

        for (const weight of moduleWeights.values()) {
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

    private getAffectedNodeIndices(nodeIndices: Iterable<number>): Set<number> {
        const result = new Set<number>();

        for (const nodeIndex of nodeIndices) {
            result.add(nodeIndex);

            for (const neighborContext of this.runtimeGraph.neighbors[nodeIndex]) {
                result.add(neighborContext.nodeIndex);
            }
        }

        return result;
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
