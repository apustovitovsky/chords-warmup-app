import type { RuntimeGraph } from "./runtimeGraph";

export function calculateModuleTransitionWeight(
    runtimeGraph: RuntimeGraph,
    nodeIndex: number,
    moduleId: number
): number {
    let result = 0;

    for (const neighborContext of runtimeGraph.neighbors[nodeIndex]) {
        const neighbor = runtimeGraph.nodes[neighborContext.nodeIndex];
        const transitionWeights = neighborContext.transitionWeights[moduleId];

        for (const neighborModuleId of neighbor.modules) {
            result += transitionWeights[neighborModuleId];
        }
    }

    return result;
}
