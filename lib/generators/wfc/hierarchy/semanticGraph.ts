import type { Graph } from "./graph";
import { GraphBuilder } from "./graphBuilder";
import type { PatternLibrary } from "./patternLibrary";

export interface SemanticGraph {
    graph: Graph<string>;
    valueIdsByPatternTagAndSectionTag: Map<string, Map<string, Map<string, number>>>
}

export function createSemanticGraph(library: PatternLibrary): SemanticGraph {
    const builder = new GraphBuilder<string>();
    const rootId = builder.createNode("root");

    const valueIdsByPatternTagAndSectionTag = new Map<string, Map<string, Map<string, number>>>();

    for (const pattern of library.patterns) {
        for (const patternTag of pattern.tags) {
            const patternNodeId = builder.getOrCreateChildNode(rootId, patternTag);

            let valueIdsBySectionTag = valueIdsByPatternTagAndSectionTag.get(patternTag);

            if (!valueIdsBySectionTag) {
                valueIdsBySectionTag = new Map<string, Map<string, number>>();
                valueIdsByPatternTagAndSectionTag.set(patternTag, valueIdsBySectionTag);
            }

            for (const section of pattern.sections) {
                for (const sectionTag of section.tags) {
                    const sectionNodeId = builder.getOrCreateChildNode(
                        patternNodeId,
                        sectionTag
                    );

                    let valueIdsByLabel = valueIdsBySectionTag.get(sectionTag);

                    if (!valueIdsByLabel) {
                        valueIdsByLabel = new Map<string, number>();
                        valueIdsBySectionTag.set(sectionTag, valueIdsByLabel);
                    }

                    for (const chord of section.chords) {
                        const valueNodeId = builder.getOrCreateChildNode(
                            sectionNodeId,
                            chord
                        );

                        valueIdsByLabel.set(chord, valueNodeId);
                    }
                }
            }
        }
    }

    return {
        graph: builder.build(),
        valueIdsByPatternTagAndSectionTag,
    };
}

