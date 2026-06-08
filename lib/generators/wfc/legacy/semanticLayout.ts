export interface SemanticSegmentDefinition {
    path: string[];
    length: number;
}

export interface SemanticLayoutSegment {
    nodeId: number;
    startIndex: number;
    endIndex: number;
}

export interface SemanticLayoutSlot {
    nodeId: number;
    domainNodeIds: number[];
}

export interface SemanticLayout {
    segments: SemanticLayoutSegment[];
    slots: SemanticLayoutSlot[];
    slotCount: number;
}
