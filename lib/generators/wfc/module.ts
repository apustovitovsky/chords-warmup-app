import type { ModuleSet } from "./moduleSet";

export interface Module {
    id: number;
    tag: string;
    graphNodeId?: number;
    possibleNeighbors: ModuleSet[];
    neighborWeights: number[][];
}

export const getModuleByTag = (
    moduleMap: Map<string, Module>,
    tag: string
): Module => {
    const module = moduleMap.get(tag);

    if (!module) {
        throw new Error(`Module not found for tag "${tag}".`);
    }

    return module;
}