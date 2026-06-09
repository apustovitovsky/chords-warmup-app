import type { ModuleSet } from "./moduleSet";

export class RuntimeEdge {
    constructor(
        readonly targetNodeIndex: number,
        readonly reverseEdgeIndex: number,
        readonly supportedModules: ModuleSet[]
    ) { }

    getSupportedModules(moduleId: number): ModuleSet {
        return this.supportedModules[moduleId];
    }
}
