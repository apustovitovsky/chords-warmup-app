import type { GenerateProgressionRequest } from "@/lib/music/generator/types";

export const defaultWarmupRequest: GenerateProgressionRequest = {
    seed: "18429",
    generatorVersion: "v1",
    settings: {
        key: "C",
        mode: "major",
        style: "pop",
        difficulty: 1,
        lengthBars: 8,
        meter: "4/4",
        harmonicRhythm: "oneChordPerBar",
        allowPassingChords: false,
        allowBorrowedChords: false,
        allowSecondaryDominants: false,
    },
};