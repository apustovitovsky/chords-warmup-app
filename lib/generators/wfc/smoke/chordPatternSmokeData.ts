import type { LayoutBuilderOptions } from "../multipass/layoutBuilder";
import type { PatternCollection } from "../multipass/patternDefinition";

export const rootInput = new Array(8).fill("root");

export const formPatternCollection: PatternCollection = {
    name: "form",
    patterns: [
        {
            parentValues: ["root"],
            values: ["intro", "verse", "chorus", "verse", "outro"],
        },
        {
            parentValues: ["root"],
            values: ["intro", "verse", "chorus", "chorus", "outro"],
        },
    ],
};

export const formOptions: LayoutBuilderOptions = {
    resolution: 2,
    overlap: 0,
};

export const chordPatternCollection: PatternCollection = {
    name: "chords",
    patterns: [
        {
            parentValues: ["intro"],
            values: ["C", "Am", "F", "G"],
        },
        {
            parentValues: ["verse"],
            values: ["C", "G", "Am", "F", "Fm"],
        },
        {
            parentValues: ["chorus"],
            values: ["F", "G", "C", "Am", "Dm"],
        },
        {
            parentValues: ["outro"],
            values: ["F", "Fm", "G", "C"],
        },
    ],
};

export const chordOptions: LayoutBuilderOptions = {
    resolution: 2,
    overlap: 1,
};
