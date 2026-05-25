export type MusicKey = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export type MusicMode = "major" | "minor";

export type MusicStyle = "pop" | "jazz" | "neoSoul" | "cinematic";

export type MajorFunctionalDegree = "I" | "IV" | "V" | "vi";

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
