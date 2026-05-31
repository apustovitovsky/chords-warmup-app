import type { Constraint } from "./constraint";
import type { Module } from "./module";
import { ModuleSet } from "./moduleSet";
import { Slot } from "./slot";
import { Direction } from "./direction";
import { getBoundaryConstraintId } from "./boundaryConstraints";
import type { SectionDefinition } from "./sectionDefinition";

class SlotBuilder {
    build(
        sections: SectionDefinition[],
        modules: Module[],
        constraints: Constraint[]
    ): Slot[] {
        const slots: Slot[] = [];

        if (sections.length === 0) {
            throw new Error("At least one section is required.");
        }

        const totalLength = sections.reduce(
            (sum, section) => sum + section.length,
            0
        );

        for (const section of sections) {
            this.validateSection(section);

            for (let index = 0; index < section.length; index++) {
                slots.push(
                    this.createSlot(
                        section,
                        modules,
                        constraints,
                        slots.length,
                        totalLength
                    )
                );
            }
        }

        this.initializeModuleHealth(slots);
        return slots;
    }

    private createSlot(
        section: SectionDefinition,
        modules: Module[],
        constraints: Constraint[],
        slotIndex: number,
        totalLength: number
    ): Slot {
        const moduleSet = new ModuleSet(modules, true);
        const modulesToEnforce = new ModuleSet(modules);

        for (const constraintId of section.tags) {
            const constraint = this.getConstraint(constraints, constraintId);
            modulesToEnforce.addSet(constraint.mask);
        }

        moduleSet.enforce(modulesToEnforce);

        const boundaryDirection = this.getBoundaryDirection(slotIndex, totalLength);

        if (boundaryDirection !== null) {
            const boundaryModules = this.createBoundaryMask(
                section,
                modules,
                constraints,
                boundaryDirection
            );

            moduleSet.enforce(boundaryModules);
        }

        return new Slot(modules, moduleSet);
    }

    private getConstraint(
        constraints: Constraint[],
        id: string
    ): Constraint {
        const constraint = constraints.find((candidate) => candidate.id === id);

        if (!constraint) {
            const availableIds = constraints
                .map((constraint) => constraint.id)
                .join(", ");

            throw new Error(
                `Constraint not found: "${id}". Available constraints: ${availableIds}.`
            );
        }

        return constraint;
    }

    private createBoundaryMask(
        section: SectionDefinition,
        modules: Module[],
        constraints: Constraint[],
        direction: Direction
    ): ModuleSet {
        const boundaryModules = new ModuleSet(modules);

        for (const constraintId of section.tags) {
            const boundaryConstraint = this.getConstraint(
                constraints,
                getBoundaryConstraintId(constraintId, direction)
            );

            boundaryModules.addSet(boundaryConstraint.mask);
        }

        return boundaryModules;
    }

    private getBoundaryDirection(
        slotIndex: number,
        totalLength: number
    ): Direction | null {
        const lastSlotIndex = totalLength - 1;

        if (slotIndex === 0 && slotIndex !== lastSlotIndex) {
            return Direction.Back;
        }

        if (slotIndex === lastSlotIndex && slotIndex !== 0) {
            return Direction.Forward;
        }

        return null;
    }

    private validateSection(section: SectionDefinition): void {
        if (section.length <= 0) {
            throw new Error("Section length must be greater than 0.");
        }

        if (section.tags.length === 0) {
            throw new Error("Section must include at least one tag.");
        }
    }

    private initializeModuleHealth(slots: Slot[]): void {
        for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
            const slot = slots[slotIndex];

            this.initializeModuleHealthForDirection(
                slot,
                slots[slotIndex - 1],
                Direction.Back
            );

            this.initializeModuleHealthForDirection(
                slot,
                slots[slotIndex + 1],
                Direction.Forward
            );
        }
    }

    private initializeModuleHealthForDirection(
        slot: Slot,
        neighbor: Slot | undefined,
        direction: Direction
    ): void {
        if (!neighbor) {
            return;
        }

        for (const module of slot.modules) {
            let health = 0;

            for (const neighborModule of neighbor.modules) {
                if (module.possibleNeighbors[direction].contains(neighborModule)) {
                    health++;
                }
            }

            slot.moduleHealth[direction][module.id] = health;
        }
    }
}

export function createSlots(
    sections: SectionDefinition[],
    modules: Module[],
    constraints: Constraint[],
): Slot[] {
    return new SlotBuilder().build(
        sections,
        modules,
        constraints
    );
}
