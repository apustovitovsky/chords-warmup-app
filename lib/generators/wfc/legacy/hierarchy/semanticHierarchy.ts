export interface SemanticHierarchy {
    patterns: SemanticPattern[];
}

export interface SemanticPattern {
    levels: string[][];
    values: string[];
}

export function expandSemanticLevels(levels: string[][]): string[][] {
    let paths: string[][] = [[]];

    for (const level of levels) {
        const nextPaths: string[][] = [];

        for (const path of paths) {
            for (const value of level) {
                nextPaths.push([...path, value]);
            }
        }

        paths = nextPaths;
    }

    return paths;
}
