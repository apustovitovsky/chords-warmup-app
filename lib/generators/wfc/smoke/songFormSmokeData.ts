import type { LayoutBuilderOptions } from "../multipass/layoutBuilder";
import type { PatternCollection } from "../multipass/patternDefinition";

export const songRootInput = new Array(8).fill("song");

export const songFormPatternCollection: PatternCollection = {
    name: "song-form",
    patterns: [
        {
            parentValues: ["song"],
            values: ["intro", "verse", "chorus", "verse", "outro"],
        },
        {
            parentValues: ["song"],
            values: ["verse", "chorus", "bridge", "chorus", "outro"],
        },
        {
            parentValues: ["song"],
            values: ["intro", "verse", "verse", "chorus", "outro"],
        },
    ],
};

export const songFormOptions: LayoutBuilderOptions = {
    resolution: 1,
    overlap: 0,
};
