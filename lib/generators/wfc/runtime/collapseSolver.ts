import { CollapseQueue } from "./collapseQueue";
import { PropagationSolver } from "./propagationSolver";
import type { RuntimeData } from "./runtimeData";

export class CollapseSolver {
    private readonly propagationSolver: PropagationSolver;
    private readonly collapseQueue: CollapseQueue;

    constructor(runtimeData: RuntimeData) {
        this.propagationSolver = new PropagationSolver(runtimeData);
        this.collapseQueue = new CollapseQueue(runtimeData);
    }

    solve(): void {
        this.propagationSolver.enforceConsistency();
        this.collapseQueue.initialize();

        let candidate = this.collapseQueue.nextCandidate();

        while (candidate !== null) {
            const moduleId = this.pickModule(candidate);
            const changedSlotIndices = this.propagationSolver.collapse(
                candidate.slotIndex,
                moduleId
            );

            this.collapseQueue.updateMany(changedSlotIndices);
            candidate = this.collapseQueue.nextCandidate();
        }
    }

    pickModule(candidate: {
        slotIndex: number,
        moduleWeights: Map<number, number>
    }): number {
        let bestModuleId: number | null = null;
        let bestWeight = -1;

        for (const [moduleId, weight] of candidate.moduleWeights) {
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
            throw new Error(`Cannot pick module from empty slot "${candidate.slotIndex}".`);
        }

        return bestModuleId;
    }
}
