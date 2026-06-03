import type { ModuleSet } from "./moduleSet";

export interface Module {
    id: number;
    possibleNeighbors: ModuleSet[];
    neighborWeights: number[][];
}
