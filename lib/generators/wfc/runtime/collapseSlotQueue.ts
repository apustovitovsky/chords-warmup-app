import { PriorityQueue } from "./helpers/priorityQueue";
import type { RuntimeData } from "./runtimeData";
import type { RuntimeSlot } from "./runtimeSlot";

interface CollapseSlotQueueEntry {
    slotIndex: number;
    entropy: number;
    version: number;
}

export class CollapseSlotQueue {
    private readonly heap = new PriorityQueue<CollapseSlotQueueEntry>(
        compareCollapseSlotQueueEntries
    );
    private readonly versions: number[];
    private readonly slots: RuntimeSlot[];

    constructor(private readonly runtimeData: RuntimeData) {
        this.slots = runtimeData.slots;
        this.versions = new Array(this.slots.length).fill(0);
    }

    initialize(): void {
        for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
            this.update(slotIndex);
        }
    }

    updateMany(slotIndices: Iterable<number>): void {
        for (const slotIndex of slotIndices) {
            this.update(slotIndex);
        }
    }

    update(slotIndex: number): void {
        const slot = this.slots[slotIndex];
        const version = ++this.versions[slotIndex];

        if (slot.moduleCount <= 1) {
            return;
        }

        this.heap.push({
            slotIndex,
            entropy: this.calculateEntropy(slot),
            version,
        });
    }

    nextSlotIndex(): number | null {
        let entry = this.heap.pop();

        while (entry !== null) {
            const slot = this.slots[entry.slotIndex];

            if (
                entry.version === this.versions[entry.slotIndex] &&
                slot.moduleCount > 1
            ) {
                return entry.slotIndex;
            }

            entry = this.heap.pop();
        }

        return null;
    }

    private calculateEntropy(slot: RuntimeSlot): number {
        let sumWeight = 0;
        let sumWeightLogWeight = 0;

        for (const moduleId of slot.modules) {
            sumWeight += this.runtimeData.moduleWeights.weights[moduleId];
            sumWeightLogWeight +=
                this.runtimeData.moduleWeights.weightLogWeights[moduleId];
        }

        return Math.log(sumWeight) - sumWeightLogWeight / sumWeight;
    }
}

function compareCollapseSlotQueueEntries(
    lhs: CollapseSlotQueueEntry,
    rhs: CollapseSlotQueueEntry
): number {
    if (lhs.entropy !== rhs.entropy) {
        return lhs.entropy - rhs.entropy;
    }

    return lhs.slotIndex - rhs.slotIndex;
}
