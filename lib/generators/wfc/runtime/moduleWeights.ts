export interface ModuleWeights {
    weights: number[];
    weightLogWeights: number[];
}

export function createModuleWeights(
    capacity: number
): ModuleWeights {
    return {
        weights: new Array(capacity).fill(1),
        weightLogWeights: new Array(capacity).fill(0),
    };
}
