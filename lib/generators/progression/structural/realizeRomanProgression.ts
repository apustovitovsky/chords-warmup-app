import { Progression } from "tonal";

import type { Tonic } from "@/lib/entities/key";

import type { RomanChord } from "./types";

export function realizeRomanProgression(
    tonic: Tonic,
    romanProgression: readonly RomanChord[]
): string[] {
    return Progression.fromRomanNumerals(
        tonic,
        [...romanProgression]
    );
}