import { SeededRandom } from "@/lib/random/seededRandom";
import type {
    GeneratedProgression,
    GenerationSettings,
    GeneratorVersion,
    ChordEventDto,
} from "./types";

const majorProgressions: ChordEventDto[][] = [
    [
        { symbol: "C", roman: "I", durationBeats: 4, role: "tonic", tags: ["diatonic"] },
        { symbol: "G", roman: "V", durationBeats: 4, role: "dominant", tags: ["diatonic"] },
        { symbol: "Am", roman: "vi", durationBeats: 4, role: "tonic", tags: ["diatonic"] },
        { symbol: "F", roman: "IV", durationBeats: 4, role: "predominant", tags: ["diatonic"] },
    ],
    [
        { symbol: "Cmaj7", roman: "Imaj7", durationBeats: 4, role: "tonic", tags: ["diatonic", "seventh"] },
        { symbol: "Am7", roman: "vi7", durationBeats: 4, role: "tonic", tags: ["diatonic", "seventh"] },
        { symbol: "Dm7", roman: "ii7", durationBeats: 4, role: "predominant", tags: ["diatonic", "seventh"] },
        { symbol: "G7", roman: "V7", durationBeats: 4, role: "dominant", tags: ["diatonic", "seventh"] },
    ],
];

export function generateProgression(
    settings: GenerationSettings,
    seed: string,
    generatorVersion: GeneratorVersion
): GeneratedProgression {
    const rng = new SeededRandom(seed);
    const selected = rng.pick(majorProgressions);

    const bars = Array.from({ length: settings.lengthBars }, (_, index) => {
        const chord = selected[index % selected.length];

        return {
            index: index + 1,
            chords: [chord],
        };
    });

    return {
        seed,
        generatorVersion,
        settings,
        bars,
    };
}
