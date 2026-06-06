import type { ModuleSet } from "./moduleSet";
import type { RuntimeNode } from "./runtimeNode";

export interface RuntimeGraph {
    nodes: RuntimeNode[];
    neighbors: RuntimeNeighbor[][];
    order: number[];
    moduleCapacity: number;
}

export interface RuntimeNeighbor {
    nodeIndex: number;
    reverseNeighborIndex: number;
    supportedModules: ModuleSet[];
    transitionWeights: number[][];
}
