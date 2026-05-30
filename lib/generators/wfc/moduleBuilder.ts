import type { Module } from "./module.ts";
import type { Pattern, PatternGroup } from "./pattern.ts";
import { ModuleSet } from "./moduleSet.ts";
import { Direction } from "./direction.ts";
import type { Constraint } from "./constraint.ts";
import { createConstraints } from "./constraintBuilder.ts";

export interface ModuleBuilderResult {
    modules: Module[];
    constraints: Constraint[];
}

export function buildModules(patternGroups: PatternGroup[]): ModuleBuilderResult {
    const patterns = patternGroups.flatMap((group) => group.patterns);
    const modules = createInitialModules(patterns);
    const moduleByTag = createModuleByTag(modules);

    configureModules(patterns, moduleByTag);

    const constraints = createConstraints(patternGroups, modules, moduleByTag);

    return { modules, constraints };
}

function createInitialModules(patterns: Pattern[]): Module[] {
    const modulesByTag = new Map<string, Module>();

    for (const pattern of patterns) {
        for (const tag of pattern.tags) {
            if (modulesByTag.has(tag)) {
                continue;
            }

            modulesByTag.set(tag, {
                id: modulesByTag.size,
                tag,
                possibleNeighbors: [],
                neighborWeights: [],
            });
        }
    }

    const modules = [...modulesByTag.values()];

    initializeModuleData(modules);

    return modules;
}

export function createModuleByTag(modules: Module[]): Map<string, Module> {
    return new Map(modules.map((module) => [module.tag, module]));
}

function initializeModuleData(modules: Module[]): void {
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

function configureModules(
    patterns: Pattern[],
    moduleByTag: Map<string, Module>
): void {
    for (const pattern of patterns) {
        for (let index = 0; index < pattern.tags.length; index++) {
            const tag = pattern.tags[index];
            const module = getModule(moduleByTag, tag);

            addNeighborByTag(
                moduleByTag,
                module,
                pattern.tags[index - 1],
                Direction.Previous
            );

            addNeighborByTag(
                moduleByTag,
                module,
                pattern.tags[index + 1],
                Direction.Next
            );
        }
    }
}

function addNeighborByTag(
    moduleByTag: Map<string, Module>,
    module: Module,
    neighborTag: string | undefined,
    direction: Direction
): void {
    if (neighborTag === undefined) {
        return;
    }

    const neighbor = getModule(moduleByTag, neighborTag);

    module.possibleNeighbors[direction].add(neighbor);
    module.neighborWeights[direction][neighbor.id]++;
}

function getModule(moduleByTag: Map<string, Module>, tag: string): Module {
    const module = moduleByTag.get(tag);

    if (!module) {
        throw new Error(`Module not found for tag "${tag}".`);
    }

    return module;
}
