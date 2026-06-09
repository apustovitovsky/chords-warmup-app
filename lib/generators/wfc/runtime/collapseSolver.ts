import { CollapseQueue } from "./collapseQueue";
import { PropagationSolver } from "./propagationSolver";
import type { RuntimeGraph } from "./runtimeGraph";

export class CollapseSolver {
    private readonly propagationSolver: PropagationSolver;
    private readonly collapseQueue: CollapseQueue;

    constructor(private readonly runtimeGraph: RuntimeGraph) {
        this.propagationSolver = new PropagationSolver(runtimeGraph);
        this.collapseQueue = new CollapseQueue(runtimeGraph);
    }

    solve(): void {
        this.propagationSolver.enforceConsistency();
        this.collapseQueue.initialize();

        let nodeIndex = this.collapseQueue.nextNodeIndex();

        while (nodeIndex !== null) {
            const moduleId = this.pickModule(nodeIndex);
            const changedNodeIndices = this.propagationSolver.collapse(
                nodeIndex,
                moduleId
            );

            this.collapseQueue.updateMany(changedNodeIndices);
            nodeIndex = this.collapseQueue.nextNodeIndex();
        }
    }

    pickModule(nodeIndex: number): number {
        const node = this.runtimeGraph.nodes[nodeIndex];
        let bestModuleId: number | null = null;
        let bestWeight = -1;

        for (const moduleId of node.modules) {
            const weight = node.moduleWeights[moduleId];

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
            throw new Error(`Cannot pick module from empty node "${nodeIndex}".`);
        }

        return bestModuleId;
    }
}
