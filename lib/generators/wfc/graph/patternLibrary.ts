export interface PatternLibrary {
    patterns: Pattern[];
}

export interface Pattern {
    tags: string[];
    sections: Section[];
}

export interface Section {
    tags: string[];
    chords: string[];
}
