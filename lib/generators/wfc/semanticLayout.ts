
export interface SemanticSectionDefinition {
    patternTag: string;
    sectionTag: string;
    length: number;
}

export interface SemanticLayoutSection {
    nodeId: number;
    startIndex: number;
    endIndex: number;
}

export interface SemanticLayout {
    sections: SemanticLayoutSection[];
    slotCount: number;
}