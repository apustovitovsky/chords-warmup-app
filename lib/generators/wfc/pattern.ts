export interface Pattern {
    id: string;
    tags: string[];
}

export interface PatternGroup {
    tags: string[];
    patterns: Pattern[];
}

export const flattenPatternGroup = (patternGroups: PatternGroup[]): Pattern[] => {
    return patternGroups.flatMap((group) => group.patterns);
};