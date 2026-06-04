import type { PatternLibrary } from "../hierarchy/patternLibrary";
import type { SemanticSegmentDefinition } from "../semanticLayout";

export const songFormLibrary: PatternLibrary = {
    patterns: [
        {
            tags: ["indie", "folk"],
            sections: [
                {
                    tags: ["form"],
                    chords: ["intro", "verse", "chorus", "verse", "outro"],
                },
                {
                    tags: ["form"],
                    chords: ["verse", "chorus", "bridge", "chorus", "outro"],
                },
            ],
        },
        {
            tags: ["rock", "indie"],
            sections: [
                {
                    tags: ["form"],
                    chords: ["intro", "verse", "verse", "chorus", "outro"],
                },
                {
                    tags: ["form"],
                    chords: ["verse", "prechorus", "chorus", "bridge", "chorus"],
                },
            ],
        },
    ],
};

export const songFormSegments: SemanticSegmentDefinition[] = [
    { patternTag: "indie", sectionTag: "form", length: 3 },
    { patternTag: "rock", sectionTag: "form", length: 3 },
    { patternTag: "folk", sectionTag: "form", length: 2 },
];
