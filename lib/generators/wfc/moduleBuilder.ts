import { type Module, getModuleByTag } from "./module";
import type { Pattern, PatternCollection } from "./pattern";
import { ModuleSet } from "./moduleSet";
import { Direction } from "./direction";


class ModuleBuilder {
    build(patternCollections: PatternCollection[]): Module[] {
        const patterns = patternCollections.flatMap((patternCollection) => patternCollection.patterns);
        const moduleByTag = this.createInitialModules(patterns);
        const modules = [...moduleByTag.values()];

        this.initializeModules(modules);
        this.configureModules(patterns, moduleByTag);

        return modules;
    }

    private createInitialModules(patterns: Pattern[]): Map<string, Module> {
        const moduleByTag = new Map<string, Module>();

        for (const pattern of patterns) {
            for (const tag of pattern.tags) {
                if (moduleByTag.has(tag)) {
                    continue;
                }

                moduleByTag.set(tag, {
                    id: moduleByTag.size,
                    tag,
                    possibleNeighbors: [],
                    neighborWeights: []
                });
            }
        }

        return moduleByTag;
    }

    private initializeModules(modules: Module[]): void {
        for (const module of modules) {
            module.possibleNeighbors = [
                new ModuleSet(modules),
                new ModuleSet(modules),
            ];

            module.neighborWeights = [
                new Array(modules.length).fill(0),
                new Array(modules.length).fill(0),
            ];
        }
    }

    private configureModules(
        patterns: Pattern[],
        moduleByTag: Map<string, Module>
    ): void {
        for (const pattern of patterns) {
            for (let index = 0; index < pattern.tags.length; index++) {
                const tag = pattern.tags[index];
                const module = getModuleByTag(moduleByTag, tag);

                this.addNeighborByTag(
                    moduleByTag,
                    module,
                    pattern.tags[index - 1],
                    Direction.Back
                );

                this.addNeighborByTag(
                    moduleByTag,
                    module,
                    pattern.tags[index + 1],
                    Direction.Forward
                );
            }
        }
    }

    private addNeighborByTag(
        moduleByTag: Map<string, Module>,
        module: Module,
        neighborTag: string | undefined,
        direction: Direction
    ): void {
        if (neighborTag === undefined) {
            return;
        }

        const neighbor = getModuleByTag(moduleByTag, neighborTag);

        module.possibleNeighbors[direction].add(neighbor);
        module.neighborWeights[direction][neighbor.id]++;
    }
}

export function createModules(
    patternCollections: PatternCollection[]
): Module[] {
    return new ModuleBuilder().build(patternCollections);
}
