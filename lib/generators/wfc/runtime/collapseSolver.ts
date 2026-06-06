import { CollapseQueue } from "./collapseQueue";
import { PropagationSolver } from "./propagationSolver";
import type { RuntimeGraph } from "./runtimeGraph";

export class CollapseSolver {
    private readonly propagationSolver: PropagationSolver;
    private readonly collapseQueue: CollapseQueue;

    constructor(runtimeGraph: RuntimeGraph) {
        this.propagationSolver = new PropagationSolver(runtimeGraph);
        this.collapseQueue = new CollapseQueue(runtimeGraph);
    }

    solve(): void {
        this.propagationSolver.enforceConsistency();
        this.collapseQueue.initialize();

        let candidate = this.collapseQueue.nextCandidate();

        while (candidate !== null) {
            const moduleId = this.pickModule(candidate);
            const changedNodeIndices = this.propagationSolver.collapse(
                candidate.nodeIndex,
                moduleId
            );

            this.collapseQueue.updateMany(changedNodeIndices);
            candidate = this.collapseQueue.nextCandidate();
        }
    }

    pickModule(candidate: {
        nodeIndex: number,
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
            throw new Error(`Cannot pick module from empty node "${candidate.nodeIndex}".`);
        }

        return bestModuleId;
    }
}
