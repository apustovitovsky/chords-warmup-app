import type { Constraint } from "./constraint.ts";
import { Direction } from "./direction.ts";
import type { Module } from "./module.ts";
import { ModuleSet } from "./moduleSet.ts";
import type { PatternGroup } from "./pattern.ts";

export function createConstraints(
    patternGroups: PatternGroup[],
    modules: Module[],
    moduleByTag: Map<string, Module>
): Constraint[] {
    const previousBoundary: Constraint = {
        id: "edge:first",
        direction: Direction.Previous,
        mask: new ModuleSet(modules),
    };

    const nextBoundary: Constraint = {
        id: "edge:last",
        direction: Direction.Next,
        mask: new ModuleSet(modules),
    };

    const constraints: Constraint[] = [
        previousBoundary,
        nextBoundary,
    ];

    const masksById = new Map<string, ModuleSet>();

    for (const group of patternGroups) {
        addBoundaryModules(group, moduleByTag, previousBoundary, nextBoundary);

        const groupMask = createGroupMask(group, modules, moduleByTag);

        for (const tag of group.tags) {
            let mask = masksById.get(tag);

            if (!mask) {
                mask = new ModuleSet(modules);
                masksById.set(tag, mask);
            }

            mask.addSet(groupMask);
        }
    }

    for (const [id, mask] of masksById) {
        constraints.push({
            id,
            direction: null,
            mask,
        });
    }

    return constraints;
}

function addBoundaryModules(
    group: PatternGroup,
    moduleByTag: Map<string, Module>,
    previousBoundary: Constraint,
    nextBoundary: Constraint
): void {
    for (const pattern of group.patterns) {
        const firstTag = pattern.tags[0];
        const lastTag = pattern.tags[pattern.tags.length - 1];

        if (firstTag !== undefined) {
            previousBoundary.mask.add(getModule(moduleByTag, firstTag));
        }

        if (lastTag !== undefined) {
            nextBoundary.mask.add(getModule(moduleByTag, lastTag));
        }
    }
}

function createGroupMask(
    group: PatternGroup,
    modules: Module[],
    moduleByTag: Map<string, Module>
): ModuleSet {
    const mask = new ModuleSet(modules);

    for (const pattern of group.patterns) {
        for (const tag of pattern.tags) {
            mask.add(getModule(moduleByTag, tag));
        }
    }

    return mask;
}

function getModule(moduleByTag: Map<string, Module>, tag: string): Module {
    const module = moduleByTag.get(tag);

    if (!module) {
        throw new Error(`Module not found for tag "${tag}".`);
    }

    return module;
}