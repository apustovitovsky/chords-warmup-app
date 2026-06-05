import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import type { RuntimeData } from "./runtimeData";
import { RuntimeSlot, type NeighborContext } from "./runtimeSlot";
import { SemanticNeighborContext } from "../semanticNeighborContext";
import type { SemanticModuleIndex } from "../semanticModuleIndex";
import type { SemanticLayout, SemanticLayoutSlot } from "../semanticLayout";

interface RuntimeSlotDraft {
    modules: ModuleSet;
    neighborIndices: Array<number | null>;
    semanticNeighborContext: SemanticNeighborContext;
}

interface CompiledNeighborSupport {
    supportedModules: ModuleSet[];
    transitionWeights: number[][];
}

export function createRuntimeSlots(
    layout: SemanticLayout,
    semanticModuleIndex: SemanticModuleIndex
): RuntimeSlot[] {
    return createRuntimeData(layout, semanticModuleIndex).slots;
}

export function createRuntimeData(
    layout: SemanticLayout,
    semanticModuleIndex: SemanticModuleIndex
): RuntimeData {
    const compiler = new RuntimeCompiler();

    return compiler.build(layout, semanticModuleIndex);
}

class RuntimeCompiler {
    build(
        layout: SemanticLayout,
        semanticModuleIndex: SemanticModuleIndex
    ): RuntimeData {
        const drafts = this.createDrafts(layout, semanticModuleIndex);
        const slots = drafts.map((draft) => new RuntimeSlot(
            draft.modules,
            this.createNeighborContexts(draft, drafts)
        ));
        const runtimeData = {
            slots,
            moduleCapacity: semanticModuleIndex.modules.length,
        };

        this.initializeModuleHealth(slots);

        return runtimeData;
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
            ...this.createCompiledNeighborSupport(
                draft,
                drafts[neighborIndex],
                direction
            ),
        };
    }

    private createCompiledNeighborSupport(
        draft: RuntimeSlotDraft,
        neighbor: RuntimeSlotDraft,
        direction: Direction
    ): CompiledNeighborSupport {
        const supportedModules = this.createEmptyModuleSets(draft.modules);
        const transitionWeights = this.createEmptyTransitionWeights(draft.modules);

        for (const moduleId of draft.modules) {
            const supported = supportedModules[moduleId];
            const weights = transitionWeights[moduleId];

            for (const neighborModuleId of neighbor.modules) {
                const weight = this.getTransitionWeight(
                    draft,
                    moduleId,
                    neighbor,
                    neighborModuleId,
                    direction
                );

                if (weight > 0) {
                    supported.add(neighborModuleId);
                    weights[neighborModuleId] = weight;
                }
            }
        }

        return {
            supportedModules,
            transitionWeights,
        };
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

    private createEmptyTransitionWeights(source: ModuleSet): number[][] {
        const result: number[][] = [];

        for (let moduleId = 0; moduleId < source.capacity; moduleId++) {
            result[moduleId] = new Array(source.capacity).fill(0);
        }

        return result;
    }

    private getTransitionWeight(
        draft: RuntimeSlotDraft,
        moduleId: number,
        neighbor: RuntimeSlotDraft,
        neighborModuleId: number,
        direction: Direction
    ): number {
        return draft.semanticNeighborContext.getTransitionWeight(
            moduleId,
            neighborModuleId,
            direction
        ) + neighbor.semanticNeighborContext.getTransitionWeight(
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
