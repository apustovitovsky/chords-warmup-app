import type { ModuleSet } from "./moduleSet";

export interface RemovalEvent {
    slotIndex: number;
    modules: ModuleSet;
}