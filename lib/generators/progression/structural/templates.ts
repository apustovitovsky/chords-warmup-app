import type { StructuralTemplate } from "./types";

export const basicStructuralTemplates: readonly StructuralTemplate[] = [
    ["I", "V", "VIm", "IV"],
    ["I", "VIm", "IIm", "V"],
    ["IIm", "V", "I"],
    ["I", "IV", "V", "I"],
    ["I", "VIm", "IV", "V"],
    ["VIm", "IV", "I", "V"],
    ["I", "IIIm", "IV", "V"],
    ["I", "IV", "IIm", "V"],
];

export const borrowedStructuralTemplates: readonly StructuralTemplate[] = [
    ["I", "IIIm", "IV", "IVm", "I"],
];