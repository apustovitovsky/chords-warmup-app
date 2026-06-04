import { CollapseSlotQueue } from "./collapseSlotQueue";
import { PropagationSolver } from "./propagationSolver";
import {
    createModuleWeights,
    type ModuleWeights,
} from "./moduleWeights";
import type { RuntimeSlot } from "./runtimeSlot";

export class CollapseSolver {
    private readonly propagator: PropagationSolver;
    private readonly queue: CollapseSlotQueue;

    constructor(
        private readonly slots: RuntimeSlot[],
        moduleCapacity: number,
        private readonly moduleStats: ModuleWeights =
            createModuleWeights(moduleCapacity)
    ) {
        this.propagator = new PropagationSolver(slots, moduleCapacity);
        this.queue = new CollapseSlotQueue(slots, moduleStats);
        this.queue.initialize();
    }

    solve(): void {
        let slotIndex = this.queue.nextSlotIndex();

        while (slotIndex !== null) {
            const slot = this.slots[slotIndex];
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
        const moduleId = slot.modules.toIds()[0];

        if (moduleId === undefined) {
            throw new Error("Cannot pick module from empty slot.");
        }

        return moduleId;
    }
}
