import { SeededRandom } from "@/lib/random/seededRandom";
import type {
    ChordEventDto,
    ChordRole,
    GeneratedProgression,
    GenerationSettings,
    GeneratorVersion,
    MusicKey,
} from "./types";

type MajorDegree = "I" | "IV" | "V" | "vi";

const majorTriads: Record<MusicKey, Record<MajorDegree, string>> = {
    C: { I: "C", IV: "F", V: "G", vi: "Am" },
    D: { I: "D", IV: "G", V: "A", vi: "Bm" },
    E: { I: "E", IV: "A", V: "B", vi: "C#m" },
    F: { I: "F", IV: "Bb", V: "C", vi: "Dm" },
    G: { I: "G", IV: "C", V: "D", vi: "Em" },
    A: { I: "A", IV: "D", V: "E", vi: "F#m" },
    B: { I: "B", IV: "E", V: "F#", vi: "G#m" },
};

const majorPatterns: MajorDegree[][] = [
    ["I", "V", "vi", "IV"],
    ["I", "vi", "IV", "V"],
    ["vi", "IV", "I", "V"],
];

const degreeRoles: Record<MajorDegree, ChordRole> = {
    I: "tonic",
    IV: "predominant",
    V: "dominant",
    vi: "tonic",
};

function createChord(key: MusicKey, degree: MajorDegree): ChordEventDto {
    return {
        symbol: majorTriads[key][degree],
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