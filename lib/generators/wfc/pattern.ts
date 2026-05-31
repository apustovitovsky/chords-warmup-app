export interface Pattern {
    id: string;
    tags: string[];
}

export interface PatternCollection {
    tags: string[];
    patterns: Pattern[];
}

export const flattenPatternCollections = (patternCollections: PatternCollection[]): Pattern[] => {
    return patternCollections.flatMap((patternCollection) => patternCollection.patterns);
};
