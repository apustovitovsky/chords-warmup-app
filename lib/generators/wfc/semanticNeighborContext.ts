import { Direction } from "./runtime/direction";
import type { Module } from "./runtime/module";
import type { ModuleSet } from "./runtime/moduleSet";

export class SemanticNeighborContext {
    private readonly transitionTagsByDirection: Array<Map<string, Set<string>>>;

    constructor(
        private readonly allModules: Module[],
        private readonly tagByModuleId: string[],
        readonly modules: ModuleSet
    ) {
        this.transitionTagsByDirection = [
            this.createTransitionTags(Direction.Back),
            this.createTransitionTags(Direction.Forward),
        ];
    }

    hasTransition(
        fromModuleId: number,
        toModuleId: number,
        direction: Direction
    ): boolean {
        return this.transitionTagsByDirection[direction]
            .get(this.tagByModuleId[fromModuleId])
            ?.has(this.tagByModuleId[toModuleId]) ?? false;
    }

    private createTransitionTags(direction: Direction): Map<string, Set<string>> {
        const result = new Map<string, Set<string>>();

        for (const moduleId of this.modules) {
            const module = this.allModules[moduleId];
            const moduleTag = this.tagByModuleId[moduleId];
            let toTags = result.get(moduleTag);

            if (!toTags) {
                toTags = new Set<string>();
                result.set(moduleTag, toTags);
            }

            for (const neighborId of module.possibleNeighbors[direction]) {
                toTags.add(this.tagByModuleId[neighborId]);
            }
        }

        return result;
    }
}
