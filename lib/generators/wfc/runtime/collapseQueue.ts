import { PriorityQueue } from "./helpers/priorityQueue";
import type { RuntimeSlot } from "./runtimeSlot";
import { calculateModuleTransitionWeight } from "./transitionWeight";

interface CollapseQueueEntry {
    slotIndex: number;
    entropy: number;
    version: number;
}

export class CollapseQueue {
    private readonly entropyQueue = new PriorityQueue<CollapseQueueEntry>(
        compareCollapseSlotQueueEntries
    );
    private readonly versions: number[];
    private readonly slots: RuntimeSlot[];

    constructor(runtimeData: { slots: RuntimeSlot[] }) {
        this.slots = runtimeData.slots;
        this.versions = new Array(this.slots.length).fill(0);
    }

    initialize(): void {
        for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
            this.update(slotIndex);
        }
    }

    updateMany(slotIndices: Iterable<number>): void {
        for (const slotIndex of this.getAffectedSlotIndices(slotIndices)) {
            this.update(slotIndex);
        }
    }

    update(slotIndex: number): void {
        const slot = this.slots[slotIndex];
        const version = ++this.versions[slotIndex];

        if (slot.moduleCount <= 1) {
            return;
        }

        this.entropyQueue.push({
            slotIndex,
            entropy: this.calculateEntropy(slotIndex),
            version,
        });
    }

    nextSlotIndex(): number | null {
        let entry = this.entropyQueue.pop();

        while (entry !== null) {
            const slot = this.slots[entry.slotIndex];

            if (
                entry.version === this.versions[entry.slotIndex] &&
                slot.moduleCount > 1
            ) {
                return entry.slotIndex;
            }

            entry = this.entropyQueue.pop();
        }

        return null;
    }

    private calculateEntropy(slotIndex: number): number {
        const slot = this.slots[slotIndex];
        let sumWeight = 0;
        let sumWeightLogWeight = 0;

        for (const moduleId of slot.modules) {
            const weight = calculateModuleTransitionWeight(
                this.slots,
                slotIndex,
                moduleId
            );

            if (weight <= 0) {
                continue;
            }

            sumWeight += weight;
            sumWeightLogWeight += weight * Math.log(weight);
        }

        if (sumWeight <= 0) {
            return Math.log(slot.moduleCount);
        }

        return Math.log(sumWeight) - sumWeightLogWeight / sumWeight;
    }

    private getAffectedSlotIndices(slotIndices: Iterable<number>): Set<number> {
        const result = new Set<number>();

        for (const slotIndex of slotIndices) {
            result.add(slotIndex);

            for (const neighborContext of this.slots[slotIndex].neighbors) {
                if (neighborContext) {
                    result.add(neighborContext.slotIndex);
                }
            }
        }

        return result;
    }
}

function compareCollapseSlotQueueEntries(
    lhs: CollapseQueueEntry,
    rhs: CollapseQueueEntry
): number {
    if (lhs.entropy !== rhs.entropy) {
        return lhs.entropy - rhs.entropy;
    }

    return lhs.slotIndex - rhs.slotIndex;
}
