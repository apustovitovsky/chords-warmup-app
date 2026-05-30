import type { ModuleSet } from "./moduleSet.ts";

export interface Slot {
    modules: ModuleSet;
    moduleHealth: number[][];
    collapsedModuleIndex: number | null;
}
