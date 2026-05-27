import { SeededRandom } from "@/lib/random/seededRandom";

import type {
    GeneratedProgression,
    GenerationSettings,
    GeneratorVersion,
} from "./types";

import { getMajorTriad } from "@/lib/entities/majorKeyTheory";
import type { Tonic } from "@/lib/entities/key";
import type {
    ChordEventDto,
    ChordRole,
    MajorFunctionalDegree,
} from "@/lib/entities/types";

const majorPatterns: MajorFunctionalDegree[][] = [
    ["I", "V", "vi", "IV"],
    ["I", "vi", "IV", "V"],
    ["vi", "IV", "I", "V"],
];

const degreeRoles: Record<MajorFunctionalDegree, ChordRole> = {
    I: "tonic",
    IV: "predominant",
    V: "dominant",
    vi: "tonic",
};

function createChord(
    tonic: Tonic,
    degree: MajorFunctionalDegree
): ChordEventDto {
    return {
        symbol: getMajorTriad(tonic, degree),
        roman: degree,
        durationBeats: 4,
        role: degreeRoles[degree],
        tags: ["diatonic", "triad"],
    };
}

export function generateProgression(
    settings: GenerationSettings,
    seed: string,
    generatorVersion: GeneratorVersion
): GeneratedProgression {
    const rng = new SeededRandom(seed);
    const selectedPattern = rng.pick(majorPatterns);

    const bars = Array.from({ length: settings.lengthBars }, (_, index) => {
        const degree = selectedPattern[index % selectedPattern.length];

        return {
            index: index + 1,
            chords: [createChord(settings.key, degree)],
        };
    });

    return {
        seed,
        generatorVersion,
        settings,
        bars,
    };
}
