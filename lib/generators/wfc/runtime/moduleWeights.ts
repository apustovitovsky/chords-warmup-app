export interface ModuleWeights {
    weights: number[];
    weightLogWeights: number[];
}

export function createModuleWeights(
    weights: number[]
): ModuleWeights {
    const normalizedWeights = weights.map((weight) => Math.max(weight, 1));

    return {
        weights: normalizedWeights,
        weightLogWeights: normalizedWeights.map((weight) =>
            weight * Math.log(weight)
        ),
    };
}

