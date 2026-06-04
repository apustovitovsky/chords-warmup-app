import { Direction } from "./runtime/direction";
import { ModuleSet } from "./runtime/moduleSet";
import { RuntimeSlot, type NeighborContext } from "./runtime/runtimeSlot";
import { SemanticNeighborContext } from "./semanticNeighborContext";
import type { SemanticModuleIndex } from "./semanticModuleIndex";
import type { SemanticLayout, SemanticLayoutSlot } from "./semanticLayout";

interface RuntimeSlotDraft {
    modules: ModuleSet;
    neighborIndices: Array<number | null>;
    semanticNeighborContext: SemanticNeighborContext;
}

export function createRuntimeSlots(
    layout: SemanticLayout,
    semanticModuleIndex: SemanticModuleIndex
): RuntimeSlot[] {
    const builder = new RuntimeSlotBuilder();

    return builder.build(layout, semanticModuleIndex);
}

class RuntimeSlotBuilder {
    build(
        layout: SemanticLayout,
        semanticModuleIndex: SemanticModuleIndex
    ): RuntimeSlot[] {
        const drafts = this.createDrafts(layout, semanticModuleIndex);
        const slots = drafts.map((draft) => new RuntimeSlot(
            draft.modules,
            this.createNeighborContexts(draft, drafts)
        ));

        this.initializeModuleHealth(slots);

        return slots;
    }

    private createDrafts(
        layout: SemanticLayout,
        semanticModuleIndex: SemanticModuleIndex
    ): RuntimeSlotDraft[] {
        const drafts: RuntimeSlotDraft[] = [];

        for (let slotIndex = 0; slotIndex < layout.slots.length; slotIndex++) {
            const slot = layout.slots[slotIndex];
            const moduleMask = semanticModuleIndex.getModuleMask(slot.nodeId);

            drafts.push({
                modules: moduleMask.clone(),
                neighborIndices: this.getNeighborIndices(layout.slots, slotIndex),
                semanticNeighborContext: semanticModuleIndex.createNeighborContext(
                    slot.supportNodeIds
                ),
            });
        }

        return drafts;
    }

    private createNeighborContexts(
        draft: RuntimeSlotDraft,
        drafts: RuntimeSlotDraft[]
    ): Array<NeighborContext | null> {
        return [
            this.createNeighborContext(draft, drafts, Direction.Back),
            this.createNeighborContext(draft, drafts, Direction.Forward),
        ];
    }

    private createNeighborContext(
        draft: RuntimeSlotDraft,
        drafts: RuntimeSlotDraft[],
        direction: Direction
    ): NeighborContext | null {
        const neighborIndex = draft.neighborIndices[direction];

        if (neighborIndex === null) {
            return null;
        }

        return {
            slotIndex: neighborIndex,
            supportedModules: this.createSupportedModules(
                draft,
                drafts[neighborIndex],
                direction
            ),
        };
    }

    private createSupportedModules(
        draft: RuntimeSlotDraft,
        neighbor: RuntimeSlotDraft,
        direction: Direction
    ): ModuleSet[] {
        const supportedModules = this.createEmptyModuleSets(draft.modules);

        for (const moduleId of draft.modules) {
            const supported = supportedModules[moduleId];

            for (const neighborModuleId of neighbor.modules) {
                if (this.hasSupport(draft, moduleId, neighbor, neighborModuleId, direction)) {
                    supported.add(neighborModuleId);
                }
            }
        }

        return supportedModules;
    }

    private createEmptyModuleSets(source: ModuleSet): ModuleSet[] {
        const result: ModuleSet[] = [];

        for (let moduleId = 0; moduleId < source.capacity; moduleId++) {
            const set = source.clone();
            set.clear();
            result[moduleId] = set;
        }

        return result;
    }

    private hasSupport(
        draft: RuntimeSlotDraft,
        moduleId: number,
        neighbor: RuntimeSlotDraft,
        neighborModuleId: number,
        direction: Direction
    ): boolean {
        return draft.semanticNeighborContext.hasTransition(
            moduleId,
            neighborModuleId,
            direction
        ) || neighbor.semanticNeighborContext.hasTransition(
            moduleId,
            neighborModuleId,
            direction
        );
    }

    private getNeighborIndices(
        slots: SemanticLayoutSlot[],
        slotIndex: number
    ): Array<number | null> {
        const slot = slots[slotIndex];

        return [
            this.hasSharedSupportContext(slot, slots[slotIndex - 1])
                ? slotIndex - 1
                : null,
            this.hasSharedSupportContext(slot, slots[slotIndex + 1])
                ? slotIndex + 1
                : null,
        ];
    }

    private hasSharedSupportContext(
        slot: SemanticLayoutSlot,
        neighbor: SemanticLayoutSlot | undefined
    ): boolean {
        if (!neighbor) {
            return false;
        }

        return slot.supportNodeIds.some((nodeId) =>
            neighbor.supportNodeIds.includes(nodeId)
        );
    }

    private initializeModuleHealth(slots: RuntimeSlot[]): void {
        for (const slot of slots) {
            this.initializeModuleHealthForDirection(slot, slots, Direction.Back);
            this.initializeModuleHealthForDirection(slot, slots, Direction.Forward);
        }
    }

    private initializeModuleHealthForDirection(
        slot: RuntimeSlot,
        slots: RuntimeSlot[],
        direction: Direction
    ): void {
        const neighborContext = slot.neighbors[direction];

        if (!neighborContext) {
            return;
        }

        const neighbor = slots[neighborContext.slotIndex];
        const neighborDirection = Direction.opposite(direction);

        for (const moduleId of slot.modules) {
            let health = 0;

            for (const neighborModuleId of neighbor.modules) {
                const neighborSupports =
                    neighbor.neighbors[neighborDirection]?.supportedModules[neighborModuleId];

                if (neighborSupports?.contains(moduleId)) {
                    health++;
                }
            }

            slot.moduleHealth[direction][moduleId] = health;
        }
    }
}
