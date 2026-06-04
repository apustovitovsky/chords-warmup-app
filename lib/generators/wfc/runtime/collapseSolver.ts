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
            const moduleId = this.pickModuleByWeight(slot);
            const changedSlotIndices = this.propagator.collapse(
                slotIndex,
                moduleId
            );

            this.queue.updateMany(changedSlotIndices);

            slotIndex = this.queue.nextSlotIndex();
        }
    }

    private pickModuleByWeight(slot: RuntimeSlot): number {
        let result: number | null = null;

        for (const moduleId of slot.modules) {
            if (
                result === null ||
                this.runtimeData.moduleWeights.weights[moduleId] >
                    this.runtimeData.moduleWeights.weights[result]
            ) {
                result = moduleId;
            }
        }

        if (result === null) {
            throw new Error("Cannot pick module from empty slot.");
        }

        return result;
    }
}
