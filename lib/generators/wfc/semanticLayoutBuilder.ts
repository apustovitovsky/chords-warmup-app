import type { SemanticGraph } from "./hierarchy/semanticGraph";
import type {
    SemanticLayout,
    SemanticLayoutSegment,
    SemanticLayoutSlot,
    SemanticSegmentDefinition,
} from "./semanticLayout";

export interface SemanticLayoutBuilderOptions {
    domainOverlap: number;
}

export function createSemanticLayout(
    definitions: SemanticSegmentDefinition[],
    semanticGraph: SemanticGraph,
    options: SemanticLayoutBuilderOptions = { domainOverlap: 0 }
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
            const nodeId = this.getNodeIdByPath(semanticGraph, definition.path);

            const segment = {
                nodeId,
                startIndex,
                endIndex: startIndex + definition.length - 1,
            };

            startIndex += definition.length;

            return segment;
        });

        const slots = this.createSlots(segments, options.domainOverlap);

        return {
            segments,
            slots,
            slotCount: startIndex,
        };
    }

    private createSlots(
        segments: SemanticLayoutSegment[],
        domainOverlap: number
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
                    domainNodeIds: this.getDomainNodeIds(
                        segments,
                        slotIndex,
                        domainOverlap
                    ),
                });
            }
        }

        return slots;
    }

    private getDomainNodeIds(
        segments: SemanticLayoutSegment[],
        slotIndex: number,
        domainOverlap: number
    ): number[] {
        const domainNodeIds: number[] = [];
        const domainStartIndex = slotIndex - domainOverlap;
        const domainEndIndex = slotIndex + domainOverlap;

        for (const segment of segments) {
            const intersects =
                segment.startIndex <= domainEndIndex &&
                segment.endIndex >= domainStartIndex;

            if (!intersects) {
                continue;
            }

            domainNodeIds.push(segment.nodeId);
        }

        return domainNodeIds;
    }

    private getNodeIdByPath(
        semanticGraph: SemanticGraph,
        path: string[]
    ): number {
        const rootNode = semanticGraph.graph.rootNode;

        if (!rootNode) {
            throw new Error("Cannot create semantic layout from an empty graph.");
        }

        let nodeId = rootNode.id;

        for (const segment of path) {
            const childNode = semanticGraph.graph
                .getChildNodes(nodeId)
                .find((node) => node.payload === segment);

            if (!childNode) {
                throw new Error(`Semantic path not found: "${path.join("/")}".`);
            }

            nodeId = childNode.id;
        }

        return nodeId;
    }
}
