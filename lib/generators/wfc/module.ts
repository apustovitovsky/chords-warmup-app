import type { ModuleSet } from "./moduleSet.ts";

export interface Module {
    id: number;
    tag: string;
    possibleNeighbors: ModuleSet[];
    neighborWeights: number[][];
}

