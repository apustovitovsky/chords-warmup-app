import type { Graph } from "./graph";
import { GraphBuilder } from "./graphBuilder";
import {
    expandSemanticLevels,
    type SemanticHierarchy,
} from "./semanticHierarchy";

export interface SemanticGraph {
    graph: Graph<string>;
}

export function createSemanticGraph(hierarchy: SemanticHierarchy): SemanticGraph {
    const builder = new GraphBuilder<string>();
    const rootId = builder.createNode("root");

    for (const pattern of hierarchy.patterns) {
        for (const path of expandSemanticLevels(pattern.levels)) {
            let parentId = rootId;

            for (const segment of path) {
                parentId = builder.getOrCreateChildNode(parentId, segment);
            }

            for (const value of pattern.values) {
                builder.getOrCreateChildNode(parentId, value);
            }
        }
    }

    return {
        graph: builder.build(),
    };
}

