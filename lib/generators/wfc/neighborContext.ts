import { Direction } from "./direction";
import type { Module } from "./module";
import type { ModuleSet } from "./moduleSet";

export class NeighborContext {
    private readonly transitionTagsByDirection: Array<Map<string, Set<string>>>;

    constructor(
        readonly neighborIndices: Array<number | null>,
        readonly modules: ModuleSet
    ) {
        this.transitionTagsByDirection = [
            this.createTransitionTags(Direction.Back),
            this.createTransitionTags(Direction.Forward),
        ];
    }

    getNeighborIndex(direction: Direction): number | null {
        return this.neighborIndices[direction];
    }

    hasTransition(
        fromModule: Module,
        toModule: Module,
        direction: Direction
    ): boolean {
        return this.transitionTagsByDirection[direction]
            .get(fromModule.tag)
            ?.has(toModule.tag) ?? false;
    }

    private createTransitionTags(direction: Direction): Map<string, Set<string>> {
        const result = new Map<string, Set<string>>();

        for (const module of this.modules) {
            let toTags = result.get(module.tag);

            if (!toTags) {
                toTags = new Set<string>();
                result.set(module.tag, toTags);
            }

            for (const neighbor of module.possibleNeighbors[direction]) {
                toTags.add(neighbor.tag);
            }
        }

        return result;
    }
}
