import type { ModuleSet } from "./moduleSet";

export interface Module {
    id: number;
    tag: string;
    possibleNeighbors: ModuleSet[];
    neighborWeights: number[][];
}
