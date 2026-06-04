import type { SemanticHierarchy } from "../hierarchy/semanticHierarchy";
import type { SemanticSegmentDefinition } from "../semanticLayout";

export const songFormLibrary: SemanticHierarchy = {
    patterns: [
        {
            levels: [
                ["indie", "folk"],
                ["form"],
            ],
            values: ["intro", "verse", "chorus", "verse", "outro"],
        },
        {
            levels: [
                ["indie", "folk"],
                ["form"],
            ],
            values: ["verse", "chorus", "bridge", "chorus", "outro"],
        },
        {
            levels: [
                ["rock", "indie"],
                ["form"],
            ],
            values: ["intro", "verse", "verse", "chorus", "outro"],
        },
        {
            levels: [
                ["rock", "indie"],
                ["form"],
            ],
            values: ["verse", "prechorus", "chorus", "bridge", "chorus"],
        },
    ],
};

export const songFormSegments: SemanticSegmentDefinition[] = [
    { path: ["indie", "form"], length: 3 },
    { path: ["rock", "form"], length: 3 },
    { path: ["folk", "form"], length: 2 },
];
