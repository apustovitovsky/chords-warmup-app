import type { Direction } from "./direction";
import type { Module } from "./module";
import type { SemanticSlot } from "./semanticSlot";

export function hasModuleSupport(
    slot: SemanticSlot,
    module: Module,
    neighbor: SemanticSlot,
    neighborModule: Module,
    direction: Direction
): boolean {
    return slot.neighborContext.hasTransition(
        module,
        neighborModule,
        direction
    ) || neighbor.neighborContext.hasTransition(
        module,
        neighborModule,
        direction
    );
}
