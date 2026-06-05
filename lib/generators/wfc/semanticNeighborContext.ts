import { Direction } from "./runtime/direction";
import type { Module } from "./runtime/module";
import type { ModuleSet } from "./runtime/moduleSet";

export class SemanticNeighborContext {
    private readonly transitionWeightsByDirection: Array<Map<string, Map<string, number>>>;

    constructor(
        private readonly allModules: Module[],
        private readonly tagByModuleId: string[],
        readonly modules: ModuleSet
    ) {
        this.transitionWeightsByDirection = [
            this.createTransitionWeights(Direction.Back),
            this.createTransitionWeights(Direction.Forward),
        ];
    }

    hasTransition(
        fromModuleId: number,
        toModuleId: number,
        direction: Direction
    ): boolean {
        return this.getTransitionWeight(fromModuleId, toModuleId, direction) > 0;
    }

    getTransitionWeight(
        fromModuleId: number,
        toModuleId: number,
        direction: Direction
    ): number {
        return this.transitionWeightsByDirection[direction]
            .get(this.tagByModuleId[fromModuleId])
            ?.get(this.tagByModuleId[toModuleId]) ?? 0;
    }

    private createTransitionWeights(
        direction: Direction
    ): Map<string, Map<string, number>> {
        const result = new Map<string, Map<string, number>>();

        for (const moduleId of this.modules) {
            const module = this.allModules[moduleId];
            const moduleTag = this.tagByModuleId[moduleId];
            let toWeights = result.get(moduleTag);

            if (!toWeights) {
                toWeights = new Map<string, number>();
                result.set(moduleTag, toWeights);
            }

            for (const neighborId of module.possibleNeighbors[direction]) {
                const neighborTag = this.tagByModuleId[neighborId];
                const weight = toWeights.get(neighborTag) ?? 0;

                toWeights.set(neighborTag, weight + 1);
            }
        }

        return result;
    }
}
