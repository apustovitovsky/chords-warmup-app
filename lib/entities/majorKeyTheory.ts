import { Key } from "tonal";

import type { Tonic } from "@/lib/entities/key";
import type { MajorFunctionalDegree } from "@/lib/entities/types";


const degreeIndexes: Record<MajorFunctionalDegree, number> = {
    I: 0,
    IV: 3,
    V: 4,
    vi: 5,
};

export function getMajorTriad(
    tonic: Tonic,
    degree: MajorFunctionalDegree
): string {
    const triads = Key.majorKey(tonic).triads;

    return triads[degreeIndexes[degree]];
}