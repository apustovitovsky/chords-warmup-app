import { getOrCreateConstraint, type Constraint } from "./constraint";
import { Direction } from "./direction";
import { getModuleByTag, type Module } from "./module";
import type { PatternCollection } from "./pattern";
import type { SectionDefinition } from "./sectionDefinition";

export function getBoundaryConstraintId(
    sectionTag: string,
    direction: Direction
): string {
    return `${sectionTag}:boundary:${direction}`;
}

export function addBoundaryModules(
    constraint: Constraint,
    patternCollections: PatternCollection[],
    moduleByTag: Map<string, Module>,
    direction: Direction
): void {
    for (const patternCollection of patternCollections) {
        addBoundaryModulesFromPatterns(
            constraint,
            patternCollection,
            moduleByTag,
            direction
        );
    }
}

function addBoundaryModulesFromPatterns(
    constraint: Constraint,
    patternCollection: PatternCollection,
    moduleByTag: Map<string, Module>,
    direction: Direction
): void {
    for (const pattern of patternCollection.patterns) {
        const tag = direction === Direction.Back
            ? pattern.tags[0]
            : pattern.tags[pattern.tags.length - 1];

        if (tag !== undefined) {
            constraint.mask.add(getModuleByTag(moduleByTag, tag));
        }
    }
}

export function addBoundaryConstraints(
    constraintById: Map<string, Constraint>,
    patternCollections: PatternCollection[],
    moduleByTag: Map<string, Module>,
    modules: Module[],
    sections: SectionDefinition[]
): void {
    const firstSection = sections[0];
    const lastSection = sections[sections.length - 1];

    if (firstSection) {
        addBoundaryConstraintsForSectionTags(
            constraintById,
            patternCollections,
            moduleByTag,
            modules,
            firstSection.tags,
            Direction.Back
        );
    }

    if (lastSection) {
        addBoundaryConstraintsForSectionTags(
            constraintById,
            patternCollections,
            moduleByTag,
            modules,
            lastSection.tags,
            Direction.Forward
        );
    }
}

function addBoundaryConstraintsForSectionTags(
    constraintById: Map<string, Constraint>,
    patternCollections: PatternCollection[],
    moduleByTag: Map<string, Module>,
    modules: Module[],
    sectionTags: string[],
    direction: Direction
): void {
    for (const sectionTag of sectionTags) {
        const boundaryConstraint = getOrCreateConstraint(
            constraintById,
            getBoundaryConstraintId(sectionTag, direction),
            modules
        );

        const matchingCollections = patternCollections.filter(
            (patternCollection) => patternCollection.tags.includes(sectionTag)
        );

        addBoundaryModules(
            boundaryConstraint,
            matchingCollections,
            moduleByTag,
            direction
        );
    }
}
