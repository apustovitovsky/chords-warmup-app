import type { ModuleSet } from "./moduleSet";

export interface EdgeTransitionData {
    modules: ModuleSet[];
}

export class RuntimeEdge {
    constructor(
        readonly targetNodeIndex: number,
        readonly reverseEdgeIndex: number,
        readonly transitions: EdgeTransitionData
    ) { }

    getSupportedModules(moduleId: number): ModuleSet {
        return this.transitions.modules[moduleId];
    }
}
