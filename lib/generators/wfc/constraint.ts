import type { Module } from "./module";
import { ModuleSet } from "./moduleSet";

export interface Constraint {
    id: string;
    mask: ModuleSet;
}

export function getOrCreateConstraint(
    constraintById: Map<string, Constraint>,
    id: string,
    modules: Module[]
): Constraint {
    let constraint = constraintById.get(id);

    if (!constraint) {
        constraint = {
            id,
            mask: new ModuleSet(modules),
        };

        constraintById.set(id, constraint);
    }

    return constraint;
}
