import type { Module } from "./module";
import { Propagator } from "./propagator";
import type { SemanticSlot } from "./semanticSlot";

export class CollapseSolver {
    private readonly propagator: Propagator;

    constructor(
        private readonly slots: SemanticSlot[],
        modules: Module[]
    ) {
        this.propagator = new Propagator(slots, modules);
    }

    solve(): void {
        let slotIndex = this.findLowestEntropySlotIndex();

        while (slotIndex !== null) {
            const slot = this.slots[slotIndex];
            const module = this.pickFirstModule(slot);

            this.propagator.collapse(slotIndex, module);

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

    private pickFirstModule(slot: SemanticSlot): Module {
        const module = slot.modules.toArray()[0];

        if (!module) {
            throw new Error("Cannot pick module from empty slot.");
        }

        return module;
    }
}
