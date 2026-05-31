import { getOrCreateConstraint, type Constraint } from "./constraint";
import type { Graph } from "./graph/graph";
import type { GraphModuleResult } from "./graphModuleBuilder";
import { getGraphConstraintId } from "./graphSectionDefinition";

export function createGraphConstraints(
    graph: Graph<string>,
    moduleResult: GraphModuleResult
): Constraint[] {
    const constraintById = new Map<string, Constraint>();

    for (const genreNode of graph.getChildNodes(graph.rootNode!.id)) {
        for (const sectionNode of graph.getChildNodes(genreNode.id)) {
            const id = getGraphConstraintId({
                patternTag: genreNode.payload,
                sectionTag: sectionNode.payload,
            });

            const constraint = getOrCreateConstraint(
                constraintById,
                id,
                moduleResult.modules
            );

            for (const valueNode of graph.getLeafNodes(sectionNode.id)) {
                const module = moduleResult.moduleByGraphNodeId.get(valueNode.id);

                if (!module) {
                    throw new Error(`Module not found for graph node "${valueNode.id}".`);
                }

                constraint.mask.add(module);
            }
        }
    }

    return [...constraintById.values()];
}