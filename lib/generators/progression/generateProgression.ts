import { SeededRandom } from "@/lib/random/seededRandom";

import type {
    ChordEventDto,
    ChordRole,
} from "@/lib/entities/types";

import {
    basicStructuralTemplates,
    borrowedStructuralTemplates,
} from "./structural/templates";
import { realizeRomanProgression } from "./structural/realizeRomanProgression";
import { StructuralProgressionGenerator } from "./structural/StructuralProgressionGenerator";
import type { RomanChord } from "./structural/types";
import type {
    GeneratedProgression,
    GenerationSettings,
    GeneratorVersion,
} from "./types";

const romanLabels: Record<RomanChord, string> = {
    I: "I",
    IIm: "ii",
    IIIm: "iii",
    IV: "IV",
    V: "V",
    VIm: "vi",
    IVm: "iv",
};

const chordRoles: Record<RomanChord, ChordRole> = {
    I: "tonic",
    IIm: "predominant",
    IIIm: "tonic",
    IV: "predominant",
    V: "dominant",
    VIm: "tonic",
    IVm: "color",
};

function createChord(
    symbol: string,
    roman: RomanChord
): ChordEventDto {
    return {
        symbol,
        roman: romanLabels[roman],
        durationBeats: 4,
        role: chordRoles[roman],
        tags: roman === "IVm"
            ? ["borrowed", "triad"]
            : ["diatonic", "triad"],
    };
}

export function generateProgression(
    settings: GenerationSettings,
    seed: string,
    generatorVersion: GeneratorVersion
): GeneratedProgression {
    const random = new SeededRandom(seed);

    const templates = settings.allowBorrowedChords
        ? [...basicStructuralTemplates, ...borrowedStructuralTemplates]
        : basicStructuralTemplates;

    const structuralGenerator = new StructuralProgressionGenerator(
        templates,
        3
    );

    const romanProgression = structuralGenerator.generate(
        settings.lengthBars,
        random
    );

    const symbols = realizeRomanProgression(
        settings.key,
        romanProgression
    );

    const bars = romanProgression.map((roman, index) => ({
        index: index + 1,
        chords: [createChord(symbols[index], roman)],
    }));

    return {
        seed,
        generatorVersion,
        settings,
        bars,
    };
}