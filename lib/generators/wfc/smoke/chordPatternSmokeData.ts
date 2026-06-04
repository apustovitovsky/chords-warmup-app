import type { SemanticHierarchy } from "../hierarchy/semanticHierarchy";
import type { SemanticSegmentDefinition } from "../semanticLayout";

export const chordPatternLibrary: SemanticHierarchy = {
    patterns: [
        {
            levels: [
                ["genre1", "genre2"],
                ["intro", "verse"],
            ],
            values: ["C", "C", "Am", "F"],
        },
        {
            levels: [
                ["genre1", "genre2"],
                ["verse"],
            ],
            values: ["F", "C", "Dm", "Bb"],
        },
        {
            levels: [
                ["genre1", "genre2"],
                ["outro", "verse"],
            ],
            values: ["C", "Em", "F", "Fm"],
        },
        {
            levels: [
                ["genre2", "genre3"],
                ["verse"],
            ],
            values: ["C", "G", "Am", "F"],
        },
        {
            levels: [
                ["genre2", "genre3"],
                ["chorus"],
            ],
            values: ["Bb", "C", "Dm", "G"],
        },
        {
            levels: [
                ["genre2", "genre3"],
                ["verse"],
            ],
            values: ["C", "Am", "F", "Fm"],
        },
    ],
};

export const chordPatternSegments: SemanticSegmentDefinition[] = [
    { path: ["genre2", "verse"], length: 2 },
    { path: ["genre3", "chorus"], length: 2 },
    { path: ["genre1", "intro"], length: 2 },
    { path: ["genre2", "outro"], length: 2 },
];
