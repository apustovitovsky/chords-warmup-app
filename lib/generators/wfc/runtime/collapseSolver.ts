import { PropagationSolver } from "./propagationSolver";
import type { RuntimeSlot } from "./runtimeSlot";

export class CollapseSolver {
    private readonly propagator: PropagationSolver;

    constructor(
        private readonly slots: RuntimeSlot[],
        moduleCapacity: number
    ) {
        this.propagator = new PropagationSolver(slots, moduleCapacity);
    }

    solve(): void {
        let slotIndex = this.findLowestEntropySlotIndex();

        while (slotIndex !== null) {
            const slot = this.slots[slotIndex];
            const moduleId = this.pickFirstModuleId(slot);

            this.propagator.collapse(slotIndex, moduleId);

            slotIndex = this.findLowestEntropySlotIndex();
        }
    }

    private findLowestEntropySlotIndex(): number | null {
        let bestSlotIndex: number | null = null;
        let bestModuleCount = Number.POSITIVE_INFINITY;

        for (let index = 0; index < this.slots.length; index++) {
            const slot = this.slots[index];

            if (slot.collapsed) {
                continue;
            }

            if (slot.moduleCount < bestModuleCount) {
                bestSlotIndex = index;
                bestModuleCount = slot.moduleCount;
            }
        }

        return bestSlotIndex;
    }

    private pickFirstModuleId(slot: RuntimeSlot): number {
        const moduleId = slot.modules.toIds()[0];

        if (moduleId === undefined) {
            throw new Error("Cannot pick module from empty slot.");
        }

        return moduleId;
    }
}
