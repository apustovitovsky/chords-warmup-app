import { z } from "zod";
import { MODES, SUPPORTED_TONICS } from "@/lib/model/harmony/key";

export const GenerationSettingsSchema = z.object({
    key: z.enum(SUPPORTED_TONICS),
    mode: z.enum(MODES),
    style: z.enum(["pop", "jazz", "neoSoul", "cinematic"]),
    difficulty: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
    ]),
    lengthBars: z.union([z.literal(4), z.literal(8), z.literal(16)]),
    meter: z.literal("4/4"),
    harmonicRhythm: z.enum(["oneChordPerBar", "twoChordsPerBar"]),
    allowPassingChords: z.boolean(),
    allowBorrowedChords: z.boolean(),
    allowSecondaryDominants: z.boolean(),
});

export const GenerateProgressionRequestSchema = z.object({
    seed: z.string().min(1).max(64),
    settings: GenerationSettingsSchema,
    generatorVersion: z.literal("v1"),
});
