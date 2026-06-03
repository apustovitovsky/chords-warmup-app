import { Direction } from "./runtime/direction";
import { ModuleSet } from "./runtime/moduleSet";
import { RuntimeSlot, type NeighborContext } from "./runtime/runtimeSlot";
import { SemanticNeighborContext } from "./semanticNeighborContext";
import type { SemanticGraph } from "./graph/semanticGraph";
import type { GraphModuleMap } from "./graphModuleBuilder";
import type { SemanticLayout, SemanticLayoutSlot } from "./semanticLayout";

interface RuntimeSlotDraft {
    modules: ModuleSet;
    neighborIndices: Array<number | null>;
    semanticNeighborContext: SemanticNeighborContext;
}

export function createRuntimeSlots(
    layout: SemanticLayout,
    semanticGraph: SemanticGraph,
    moduleMap: GraphModuleMap
): RuntimeSlot[] {
    const builder = new RuntimeSlotBuilder();

    return builder.build(layout, semanticGraph, moduleMap);
}

class RuntimeSlotBuilder {
    build(
        layout: SemanticLayout,
        semanticGraph: SemanticGraph,
        moduleMap: GraphModuleMap
    ): RuntimeSlot[] {
        const drafts = this.createDrafts(layout, semanticGraph, moduleMap);
        const slots = drafts.map((draft) => new RuntimeSlot(
            draft.modules,
            this.createNeighborContexts(draft, drafts)
        ));

        this.initializeModuleHealth(slots);

        return slots;
    }

    private createDrafts(
        layout: SemanticLayout,
        semanticGraph: SemanticGraph,
        moduleMap: GraphModuleMap
    ): RuntimeSlotDraft[] {
        const drafts: RuntimeSlotDraft[] = [];
        const moduleMaskByNodeId = new Map<number, ModuleSet>();

        for (let slotIndex = 0; slotIndex < layout.slots.length; slotIndex++) {
            const slot = layout.slots[slotIndex];
            const moduleMask = this.getModuleMask(
                semanticGraph,
                moduleMap,
                moduleMaskByNodeId,
                slot.nodeId
            );

            drafts.push({
                modules: moduleMask.clone(),
                neighborIndices: this.getNeighborIndices(layout.slots, slotIndex),
                semanticNeighborContext: this.createSemanticNeighborContext(
                    semanticGraph,
                    moduleMap,
                    moduleMaskByNodeId,
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

    private createSemanticNeighborContext(
        semanticGraph: SemanticGraph,
        moduleMap: GraphModuleMap,
        moduleMaskByNodeId: Map<number, ModuleSet>,
        supportNodeIds: number[]
    ): SemanticNeighborContext {
        const neighborModules = new ModuleSet(moduleMap.modules.length);

        for (const nodeId of supportNodeIds) {
            neighborModules.addSet(this.getModuleMask(
                semanticGraph,
                moduleMap,
                moduleMaskByNodeId,
                nodeId
            ));
        }

        return new SemanticNeighborContext(
            moduleMap.modules,
            moduleMap.tagByModuleId,
            neighborModules
        );
    }

    private getModuleMask(
        semanticGraph: SemanticGraph,
        moduleMap: GraphModuleMap,
        moduleMaskByNodeId: Map<number, ModuleSet>,
        nodeId: number
    ): ModuleSet {
        let moduleMask = moduleMaskByNodeId.get(nodeId);

        if (!moduleMask) {
            moduleMask = this.createModuleMask(semanticGraph, moduleMap, nodeId);
            moduleMaskByNodeId.set(nodeId, moduleMask);
        }

        return moduleMask;
    }

    private createModuleMask(
        semanticGraph: SemanticGraph,
        moduleMap: GraphModuleMap,
        nodeId: number
    ): ModuleSet {
        const mask = new ModuleSet(moduleMap.modules.length);

        for (const leafNodeId of semanticGraph.graph.getLeafNodeIds(nodeId)) {
            const module = moduleMap.moduleByGraphNodeId.get(leafNodeId);

            if (!module) {
                throw new Error(`Module not found for graph node "${leafNodeId}".`);
            }

            mask.add(module.id);
        }

        return mask;
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
