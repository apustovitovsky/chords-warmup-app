export type SegmentRole = "intro" | "verse" | "outro";

export interface PatternDefinition {
    id: string;
    segments: SegmentDefinition[];
}

export interface SegmentDefinition {
    role: SegmentRole;
    chords: string[];
}

export interface GeneratedSegment {
    patternId: string;
    segmentIndex: number;
    role: SegmentRole;
    chords: string[];
}

// export interface GenerationResult {
//     backtracks: number;
//     segments: GeneratedSegment[];
// }

export type GenerationResult =
    | {
        ok: true;
        backtracks: number;
        segments: GeneratedSegment[];
    }
    | {
        ok: false;
        backtracks: number;
        reason: "no-valid-progression";
    };

export interface SegmentCandidate {
    patternId: string;
    segmentIndex: number;
    segment: SegmentDefinition;
}

export interface PatternCollectionDefinition {
    id: string;
    version: string;
    patterns: PatternDefinition[]
}
