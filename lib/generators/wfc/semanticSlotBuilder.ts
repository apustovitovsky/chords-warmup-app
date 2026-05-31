import type { Module } from "./module";
import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import { SemanticSlot } from "./semanticSlot";
import type { SemanticGraph } from "./graph/semanticGraph";
import type { GraphModuleResult } from "./graphModuleBuilder";
import type { SemanticLayout, SemanticLayoutSection } from "./semanticLayout";

export function createSemanticSlots(
    layout: SemanticLayout,
    semanticGraph: SemanticGraph,
    moduleResult: GraphModuleResult
): SemanticSlot[] {
    const builder = new SemanticSlotBuilder();

    return builder.build(layout, semanticGraph, moduleResult);
}

class SemanticSlotBuilder {
    build(
        layout: SemanticLayout,
        semanticGraph: SemanticGraph,
        moduleResult: GraphModuleResult
    ): SemanticSlot[] {
        const slots: SemanticSlot[] = [];
        const supportOverlap = 0;

        for (const section of layout.sections) {
            const moduleMask = this.createModuleMask(
                semanticGraph,
                moduleResult,
                section.nodeId
            );

            for (
                let slotIndex = section.startIndex;
                slotIndex <= section.endIndex;
                slotIndex++
            ) {

                const { supportModules, supportNodeIds } = this.createSupportContext(
                    layout.sections,
                    semanticGraph,
                    moduleResult,
                    slotIndex,
                    supportOverlap
                );

                slots.push(new SemanticSlot(
                    section.nodeId,
                    moduleResult.modules,
                    moduleMask.clone(),
                    supportNodeIds,
                    supportModules
                ));
            }
        }

        this.initializeModuleHealth(slots);

        return slots;
    }

    private createSupportContext(
        sections: SemanticLayoutSection[],
        semanticGraph: SemanticGraph,
        moduleResult: GraphModuleResult,
        globalSlotIndex: number,
        supportOverlap: number
    ): {
        supportModules: ModuleSet;
        supportNodeIds: number[];
    } {
        const supportModules = new ModuleSet(moduleResult.modules);
        const supportNodeIds: number[] = [];

        const supportStartIndex = globalSlotIndex - supportOverlap;
        const supportEndIndex = globalSlotIndex + supportOverlap;

        for (const section of sections) {
            const intersects =
                section.startIndex <= supportEndIndex &&
                section.endIndex >= supportStartIndex;

            if (!intersects) {
                continue;
            }

            supportModules.addSet(this.createModuleMask(
                semanticGraph,
                moduleResult,
                section.nodeId
            ));

            supportNodeIds.push(section.nodeId);
        }

        return { supportModules, supportNodeIds };
    }

    private createModuleMask(
        semanticGraph: SemanticGraph,
        moduleResult: GraphModuleResult,
        nodeId: number
    ): ModuleSet {
        const mask = new ModuleSet(moduleResult.modules);

        for (const leafNode of semanticGraph.graph.getLeafNodes(nodeId)) {
            const module = moduleResult.moduleByGraphNodeId.get(leafNode.id);

            if (!module) {
                throw new Error(`Module not found for graph node "${leafNode.id}".`);
            }

            mask.add(module);
        }

        return mask;
    }

    private initializeModuleHealth(slots: SemanticSlot[]): void {
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
        slot: SemanticSlot,
        neighbor: SemanticSlot | undefined,
        direction: Direction
    ): void {
        if (!neighbor || !this.hasSharedSupportContext(slot, neighbor)) {
            return;
        }

        for (const module of slot.modules) {
            let health = 0;

            for (const neighborModule of neighbor.modules) {
                if (this.hasSupport(slot, module, neighbor, neighborModule, direction)) {
                    health++;
                }
            }

            slot.moduleHealth[direction][module.id] = health;
        }
    }

    private hasSharedSupportContext(
        slot: SemanticSlot,
        neighbor: SemanticSlot
    ): boolean {
        return slot.supportNodeIds.some((nodeId) =>
            neighbor.supportNodeIds.includes(nodeId)
        );
    }

    private hasSupport(
        slot: SemanticSlot,
        module: Module,
        neighbor: SemanticSlot,
        neighborModule: Module,
        direction: Direction
    ): boolean {
        return this.hasTagTransition(
            slot.supportModules,
            module.tag,
            neighborModule.tag,
            direction
        ) || this.hasTagTransition(
            neighbor.supportModules,
            module.tag,
            neighborModule.tag,
            direction
        );
    }

    private hasTagTransition(
        modules: ModuleSet,
        fromTag: string,
        toTag: string,
        direction: Direction
    ): boolean {
        for (const contextModule of modules) {
            if (contextModule.tag !== fromTag) {
                continue;
            }

            for (const contextNeighbor of contextModule.possibleNeighbors[direction]) {
                if (contextNeighbor.tag === toTag) {
                    return true;
                }
            }
        }

        return false;
    }
}