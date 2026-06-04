import type { PatternLibrary } from "../hierarchy/patternLibrary";
import type { SemanticSegmentDefinition } from "../semanticLayout";

export const chordPatternLibrary: PatternLibrary = {
    patterns: [
        {
            tags: ["genre1", "genre2"],
            sections: [
                {
                    tags: ["intro", "verse"],
                    chords: ["C", "C", "Am", "F"],
                },
                {
                    tags: ["verse"],
                    chords: ["F", "C", "Dm", "Bb"],
                },
                {
                    tags: ["outro", "verse"],
                    chords: ["C", "Em", "F", "Fm"],
                },
            ],
        },
        {
            tags: ["genre2", "genre3"],
            sections: [
                {
                    tags: ["verse"],
                    chords: ["C", "G", "Am", "F"],
                },
                {
                    tags: ["chorus"],
                    chords: ["Bb", "C", "Dm", "G"],
                },
                {
                    tags: ["verse"],
                    chords: ["C", "Am", "F", "Fm"],
                },
            ],
        },
    ],
};

export const chordPatternSegments: SemanticSegmentDefinition[] = [
    { patternTag: "genre2", sectionTag: "verse", length: 2 },
    { patternTag: "genre3", sectionTag: "chorus", length: 2 },
    { patternTag: "genre1", sectionTag: "intro", length: 2 },
    { patternTag: "genre2", sectionTag: "outro", length: 2 },
];
