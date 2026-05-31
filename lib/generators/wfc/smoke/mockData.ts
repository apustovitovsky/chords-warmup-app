const PatternCollectionLarge = [
    {
        tags: ["intro"],
        patterns: [
            { id: "basic-1", tags: ["C", "G", "Am", "F", "Dm", "G", "C", "Em"] },
            { id: "basic-2", tags: ["C", "Em", "F", "G", "Am", "Dm", "F", "G", "C"] },
            { id: "basic-3", tags: ["F", "G", "C", "Am", "Dm", "Em", "F", "G", "Am", "C"] },
            { id: "basic-4", tags: ["Am", "F", "C", "G", "Em", "Dm", "F", "G", "C", "Am", "F"] },
            { id: "basic-5", tags: ["Dm", "G", "Em", "Am", "F", "C", "Dm", "G", "C", "Em", "Am", "F"] },
        ]
    },
    {
        tags: ["verse", "chorus"],
        patterns: [
            { id: "basic-6", tags: ["Db", "Ab", "Bbm", "Gb", "Ebm", "Ab", "Db", "Fm"] },
            { id: "basic-7", tags: ["Db", "Fm", "Gb", "Ab", "Bbm", "Ebm", "Gb", "Ab", "Db"] },
            { id: "basic-8", tags: ["Gb", "Ab", "Db", "Bbm", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Db"] },
            { id: "basic-9", tags: ["Bbm", "Gb", "Db", "Ab", "Fm", "Ebm", "Gb", "Ab", "Db", "Bbm", "Gb"] },
            { id: "basic-10", tags: ["Ebm", "Ab", "Fm", "Bbm", "Gb", "Db", "Ebm", "Ab", "Db", "Fm", "Bbm", "Gb"] },
        ]
    },
    {
        tags: ["outro"],
        patterns: [
            { id: "basic-11", tags: ["D", "A", "Bm", "G", "Em", "A", "D", "F#m"] },
            { id: "basic-12", tags: ["D", "F#m", "G", "A", "Bm", "Em", "G", "A", "D"] },
            { id: "basic-13", tags: ["G", "A", "D", "Bm", "Em", "F#m", "G", "A", "Bm", "D"] },
            { id: "basic-14", tags: ["Bm", "G", "D", "A", "F#m", "Em", "G", "A", "D", "Bm", "G"] },
            { id: "basic-15", tags: ["Em", "A", "F#m", "Bm", "G", "D", "Em", "A", "D", "F#m", "Bm", "G"] },
        ]
    }
];

const PatternCollectionSmall = [
    {
        tags: ["intro"],
        patterns: [
            { id: "basic-1", tags: ["C", "G", "Am", "F", "Dm", "G", "C", "Em"] },
        ]
    },
    {
        tags: ["verse"],
        patterns: [
            { id: "basic-6", tags: ["Db", "Ab", "Bbm", "Gb", "Ebm", "Ab", "Db", "Fm"] },
        ]
    },
    {
        tags: ["outro"],
        patterns: [
            { id: "basic-11", tags: ["D", "A", "Bm", "G", "Em", "A", "D", "F#m"] },
            { id: "basic-11", tags: ["D", "A", "Bm", "G", "Em", "A", "D", "Db"] },
        ]
    }
];

export { PatternCollectionSmall as MockCollection };