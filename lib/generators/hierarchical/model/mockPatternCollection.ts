import type { PatternCollectionDefinition } from "./patternCollectionDefinition.ts";

const MockPatternCollection: PatternCollectionDefinition =
{
    id: "basic-collection",
    version: "0.0",
    patterns: [
        {
            id: "axis",
            segments: [
                { role: "intro", chords: ["I", "I", "V", "V"] },
                { role: "verse", chords: ["vi", "vi", "IV", "IV"] },
                { role: "verse", chords: ["I", "I", "V", "V"] },
                { role: "outro", chords: ["vi", "vi", "IV", "IV"] },
            ],
        },
        {
            id: "pop-2",
            segments: [
                { role: "intro", chords: ["I", "IV/I", "Imaj7", "IV/I"] },
                { role: "verse", chords: ["I", "iii/VII", "vi", "I/V"] },
                { role: "verse", chords: ["IV", "I/III", "ii", "V"] },
                { role: "verse", chords: ["IV", "I/III", "ii", "III"] },
            ],
        },
        {
            id: "edm-1",
            segments: [
                { role: "verse", chords: ["i", "VII", "VI", "III"] },
                { role: "verse", chords: ["iv", "VI", "VII", "i"] },
            ],
        },
        {
            id: "epic",
            segments: [
                { role: "verse", chords: ["I7", "II", "iii", "V", "vii"] },
                { role: "verse", chords: ["vi", "II", "iii", "V"] },
            ],
        },
        {
            id: "pop-4",
            segments: [
                { role: "intro", chords: ["I", "Imaj9", "vii7(b5)", "III"] },
                { role: "verse", chords: ["vi", "I/V", "iv#dim", "IV7"] },
                { role: "verse", chords: ["I/V", "V", "III", "vi"] },
                { role: "outro", chords: ["I", "ii", "IV", "I"] },
            ],
        },
        {
            id: "doo-wop-ballad",
            segments: [
                { role: "intro", chords: ["I", "I", "vi", "vi"] },
                { role: "verse", chords: ["IV", "IV", "V", "V"] },
                { role: "verse", chords: ["I", "I", "vi", "vi"] },
                { role: "verse", chords: ["IV", "V", "I", "I"] },
            ],
        },
        {
            id: "pachelbel-canon",
            segments: [
                { role: "intro", chords: ["I", "V", "vi", "iii"] },
                { role: "verse", chords: ["IV", "I", "IV", "V"] },
                { role: "verse", chords: ["I", "V", "vi", "iii"] },
                { role: "verse", chords: ["IV", "I", "IV", "V"] },
            ],
        },
        {
            id: "royal-road-jpop",
            segments: [
                { role: "intro", chords: ["IV", "V", "iii", "vi"] },
                { role: "verse", chords: ["ii", "V", "I", "I"] },
                { role: "verse", chords: ["IV", "V", "iii", "vi"] },
                { role: "verse", chords: ["ii", "V", "I", "I"] },
            ],
        },
        {
            id: "jazz-standards-turnaround",
            segments: [
                { role: "intro", chords: ["I", "vi", "ii", "V"] },
                { role: "verse", chords: ["iii", "VI", "ii", "V"] },
                { role: "verse", chords: ["I", "vi", "ii", "V"] },
                { role: "verse", chords: ["I", "VI", "ii", "V"] },
            ],
        },
    ]
};

export default MockPatternCollection;
