export type GeneratorVersion = "v1";

export type MusicKey = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export type MusicMode = "major" | "minor";

export type MusicStyle = "pop" | "jazz" | "neoSoul" | "cinematic";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type GenerationSettings = {
    key: MusicKey;
    mode: MusicMode;
    style: MusicStyle;
    difficulty: Difficulty;
    lengthBars: 4 | 8 | 16;
    meter: "4/4";
    harmonicRhythm: "oneChordPerBar" | "twoChordsPerBar";
    allowPassingChords: boolean;
    allowBorrowedChords: boolean;
    allowSecondaryDominants: boolean;
};

export type GenerateProgressionRequest = {
    seed: string;
    settings: GenerationSettings;
    generatorVersion: GeneratorVersion;
};

export type ChordRole =
    | "tonic"
    | "predominant"
    | "dominant"
    | "passing"
    | "color";

export type ChordEventDto = {
    symbol: string;
    roman: string;
    durationBeats: number;
    role: ChordRole;
    tags: string[];
};

export type BarDto = {
    index: number;
    chords: ChordEventDto[];
};

export type GeneratedProgression = {
    seed: string;
    generatorVersion: GeneratorVersion;
    settings: GenerationSettings;
    bars: BarDto[];
};
