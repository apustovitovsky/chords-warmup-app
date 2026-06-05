import { CollapseQueue } from "./collapseQueue";
import { PropagationSolver } from "./propagationSolver";
import type { RuntimeData } from "./runtimeData";
import type { RuntimeSlot } from "./runtimeSlot";
import { calculateModuleTransitionWeight } from "./transitionWeight";

export class CollapseSolver {
    private readonly propagator: PropagationSolver;
    private readonly queue: CollapseQueue;
    private readonly slots: RuntimeSlot[];

    constructor(runtimeData: RuntimeData) {
        this.slots = runtimeData.slots;
        this.propagator = new PropagationSolver(runtimeData);
        this.queue = new CollapseQueue(runtimeData);
    }

    solve(): void {
        this.propagator.enforceConsistency();
        this.queue.initialize();

        let slotIndex = this.queue.nextSlotIndex();

        while (slotIndex !== null) {
            const moduleId = this.pickModule(slotIndex);
            const changedSlotIndices = this.propagator.collapse(
                slotIndex,
                moduleId
            );

            this.queue.updateMany(changedSlotIndices);

            slotIndex = this.queue.nextSlotIndex();
        }
    }

    pickModule(slotIndex: number): number {
        const slot = this.slots[slotIndex];
        let bestModuleId: number | null = null;
        let bestWeight = -1;

        for (const moduleId of slot.modules) {
            const weight = this.calculateModuleWeight(slotIndex, moduleId);

            if (
                bestModuleId === null ||
                weight > bestWeight ||
                (weight === bestWeight && moduleId < bestModuleId)
            ) {
                bestModuleId = moduleId;
                bestWeight = weight;
            }
        }

        if (bestModuleId === null) {
            throw new Error(`Cannot pick module from empty slot "${slotIndex}".`);
        }

        return bestModuleId;
    }

    // For smoke ts only
    calculateModuleWeight(slotIndex: number, moduleId: number): number {
        return calculateModuleTransitionWeight(
            this.slots,
            slotIndex,
            moduleId
        );
    }
}
