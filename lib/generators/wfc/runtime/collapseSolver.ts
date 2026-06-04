import { CollapseSlotQueue } from "./collapseSlotQueue";
import { PropagationSolver } from "./propagationSolver";
import type { RuntimeData } from "./runtimeData";
import type { RuntimeSlot } from "./runtimeSlot";

export class CollapseSolver {
    private readonly propagator: PropagationSolver;
    private readonly queue: CollapseSlotQueue;

    constructor(private readonly runtimeData: RuntimeData) {
        this.propagator = new PropagationSolver(runtimeData);
        this.queue = new CollapseSlotQueue(runtimeData);
        this.propagator.enforceConsistency();
        this.queue.initialize();
    }

    solve(): void {
        let slotIndex = this.queue.nextSlotIndex();

        while (slotIndex !== null) {
            const slot = this.runtimeData.slots[slotIndex];
            const moduleId = this.pickFirstModule(slot);
            const changedSlotIndices = this.propagator.collapse(
                slotIndex,
                moduleId
            );

            this.queue.updateMany(changedSlotIndices);

            slotIndex = this.queue.nextSlotIndex();
        }
    }

    private pickFirstModule(slot: RuntimeSlot): number {
        let result: number | null = null;

        for (const moduleId of slot.modules) {
            if (result === null) {
                result = moduleId;
            }
        }

        if (result === null) {
            throw new Error("Cannot pick module from empty slot.");
        }

        return result;
    }
}
