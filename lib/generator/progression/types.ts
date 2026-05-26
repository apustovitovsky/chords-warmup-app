import type { Mode, Tonic } from "@/lib/entities/key";
import type {
    ChordEventDto,
    MusicStyle,
} from "@/lib/entities/types";

export type GeneratorVersion = "v1";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type GenerationSettings = {
    key: Tonic;
    mode: Mode;
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
