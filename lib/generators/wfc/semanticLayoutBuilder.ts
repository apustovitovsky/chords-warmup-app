import type { SemanticGraph } from "./graph/semanticGraph";
import type {
    SemanticLayout,
    SemanticLayoutSection,
    SemanticSectionDefinition,
} from "./semanticLayout";

export function createSemanticLayout(
    definitions: SemanticSectionDefinition[],
    semanticGraph: SemanticGraph
): SemanticLayout {
    const builder = new SemanticLayoutBuilder();

    return builder.build(definitions, semanticGraph);
}

class SemanticLayoutBuilder {
    build(
        definitions: SemanticSectionDefinition[],
        semanticGraph: SemanticGraph
    ): SemanticLayout {
        let startIndex = 0;

        const sections: SemanticLayoutSection[] = definitions.map((definition) => {
            const nodeId = this.getSectionNodeId(
                semanticGraph,
                definition.patternTag,
                definition.sectionTag
            );

            const section = {
                nodeId,
                startIndex,
                endIndex: startIndex + definition.length - 1,
                length: definition.length,
            };

            startIndex += definition.length;

            return section;
        });

        return {
            sections,
            slotCount: startIndex,
        };
    }

    private getSectionNodeId(
        semanticGraph: SemanticGraph,
        patternTag: string,
        sectionTag: string
    ): number {
        const rootNode = semanticGraph.graph.rootNode;

        if (!rootNode) {
            throw new Error("Cannot create semantic layout from an empty graph.");
        }

        const patternNode = semanticGraph.graph
            .getChildNodes(rootNode.id)
            .find((node) => node.payload === patternTag);

        if (!patternNode) {
            throw new Error(`Pattern tag not found: "${patternTag}".`);
        }

        const sectionNode = semanticGraph.graph
            .getChildNodes(patternNode.id)
            .find((node) => node.payload === sectionTag);

        if (!sectionNode) {
            throw new Error(`Section tag "${sectionTag}" not found under pattern tag "${patternTag}".`);
        }

        return sectionNode.id;
    }
}