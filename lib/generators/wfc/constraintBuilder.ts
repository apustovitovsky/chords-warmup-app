import { getOrCreateConstraint, type Constraint } from "./constraint";
import { getModuleByTag, type Module } from "./module";
import type { PatternCollection } from "./pattern";
import type { SectionDefinition } from "./sectionDefinition";
import { addBoundaryConstraints } from "./boundaryConstraints";

class ConstraintBuilder {
    build(
        patternCollections: PatternCollection[],
        modules: Module[],
        sections: SectionDefinition[]
    ): Constraint[] {
        const moduleByTag = new Map<string, Module>();
        const constraintById = new Map<string, Constraint>();

        for (const module of modules) {
            moduleByTag.set(module.tag, module);
        }

        for (const patternCollection of patternCollections) {
            for (const tag of patternCollection.tags) {
                const constraint = getOrCreateConstraint(
                    constraintById,
                    tag,
                    modules
                );

                this.addPatternModulesToConstraint(constraint, patternCollection, moduleByTag);
            }
        }

        addBoundaryConstraints(
            constraintById,
            patternCollections,
            moduleByTag,
            modules,
            sections
        );

        return [...constraintById.values()];
    }

    private addPatternModulesToConstraint(
        constraint: Constraint,
        patternCollection: PatternCollection,
        moduleByTag: Map<string, Module>
    ): void {
        for (const pattern of patternCollection.patterns) {
            for (const tag of pattern.tags) {
                constraint.mask.add(getModuleByTag(moduleByTag, tag));
            }
        }
    }
}

export function createConstraints(
    patternCollections: PatternCollection[],
    modules: Module[],
    sections: SectionDefinition[]
): Constraint[] {
    return new ConstraintBuilder().build(patternCollections, modules, sections);
}
