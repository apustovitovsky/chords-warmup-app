export type RomanChord =
    | "I"
    | "IIm"
    | "IIIm"
    | "IV"
    | "V"
    | "VIm"
    | "IVm";

export type StructuralTemplate = readonly RomanChord[];