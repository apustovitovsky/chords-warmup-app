import type { Direction } from "./direction.ts";
import { ModuleSet } from "./moduleSet.ts";

export interface Constraint {
    id: string;
    direction: Direction | null;
    mask: ModuleSet;
}

