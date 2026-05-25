export const SUPPORTED_TONICS = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
] as const;

export type Tonic = (typeof SUPPORTED_TONICS)[number];

export const MODES = ["major", "minor"] as const;

export type Mode = (typeof MODES)[number];

export type Key = {
    tonic: Tonic;
    mode: Mode;
};