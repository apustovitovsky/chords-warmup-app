import type { SemanticGraph } from "./hierarchy/semanticGraph";
import type {
    SemanticLayout,
    SemanticLayoutSegment,
    SemanticLayoutSlot,
    SemanticSegmentDefinition,
} from "./semanticLayout";

export interface SemanticLayoutBuilderOptions {
    supportOverlap: number;
}

export function createSemanticLayout(
    definitions: SemanticSegmentDefinition[],
    semanticGraph: SemanticGraph,
    options: SemanticLayoutBuilderOptions = { supportOverlap: 0 }
): SemanticLayout {
    const builder = new SemanticLayoutBuilder();

    return builder.build(definitions, semanticGraph, options);
}

class SemanticLayoutBuilder {
    build(
        definitions: SemanticSegmentDefinition[],
        semanticGraph: SemanticGraph,
        options: SemanticLayoutBuilderOptions
    ): SemanticLayout {
        let startIndex = 0;

        const segments: SemanticLayoutSegment[] = definitions.map((definition) => {
            const nodeId = this.getSectionNodeId(
                semanticGraph,
                definition.patternTag,
                definition.sectionTag
            );

            const segment = {
                nodeId,
                startIndex,
                endIndex: startIndex + definition.length - 1,
            };

            startIndex += definition.length;

            return segment;
        });

        const slots = this.createSlots(segments, options.supportOverlap);

        return {
            segments,
            slots,
            slotCount: startIndex,
        };
    }

    private createSlots(
        segments: SemanticLayoutSegment[],
        supportOverlap: number
    ): SemanticLayoutSlot[] {
        const slots: SemanticLayoutSlot[] = [];

        for (const segment of segments) {
            for (
                let slotIndex = segment.startIndex;
                slotIndex <= segment.endIndex;
                slotIndex++
            ) {
                slots.push({
                    nodeId: segment.nodeId,
                    supportNodeIds: this.getSupportNodeIds(
                        segments,
                        slotIndex,
                        supportOverlap
                    ),
                });
            }
        }

        return slots;
    }

    private getSupportNodeIds(
        segments: SemanticLayoutSegment[],
        slotIndex: number,
        supportOverlap: number
    ): number[] {
        const supportNodeIds: number[] = [];
        const supportStartIndex = slotIndex - supportOverlap;
        const supportEndIndex = slotIndex + supportOverlap;

        for (const segment of segments) {
            const intersects =
                segment.startIndex <= supportEndIndex &&
                segment.endIndex >= supportStartIndex;

            if (!intersects) {
                continue;
            }

            supportNodeIds.push(segment.nodeId);
        }

        return supportNodeIds;
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
