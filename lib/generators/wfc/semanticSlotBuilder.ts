import type { Module } from "./module";
import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import { NeighborContext } from "./neighborContext";
import { SemanticSlot } from "./semanticSlot";
import type { SemanticGraph } from "./graph/semanticGraph";
import type { GraphModuleMap } from "./graphModuleBuilder";
import type { SemanticLayout, SemanticLayoutSlot } from "./semanticLayout";

export function createSemanticSlots(
    layout: SemanticLayout,
    semanticGraph: SemanticGraph,
    moduleMap: GraphModuleMap
): SemanticSlot[] {
    const builder = new SemanticSlotBuilder();

    return builder.build(layout, semanticGraph, moduleMap);
}

class SemanticSlotBuilder {
    build(
        layout: SemanticLayout,
        semanticGraph: SemanticGraph,
        moduleMap: GraphModuleMap
    ): SemanticSlot[] {
        const slots: SemanticSlot[] = [];
        const moduleMaskByNodeId = new Map<number, ModuleSet>();

        for (let slotIndex = 0; slotIndex < layout.slots.length; slotIndex++) {
            const slot = layout.slots[slotIndex];
            const moduleMask = this.getModuleMask(
                semanticGraph,
                moduleMap,
                moduleMaskByNodeId,
                slot.nodeId
            );

            slots.push(new SemanticSlot(
                slot.nodeId,
                moduleMap.modules,
                moduleMask.clone(),
                this.createNeighborContext(
                    this.getNeighborIndices(layout.slots, slotIndex),
                    semanticGraph,
                    moduleMap,
                    moduleMaskByNodeId,
                    slot.supportNodeIds
                )
            ));
        }

        this.initializeModuleHealth(slots);

        return slots;
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

    private createNeighborContext(
        neighborIndices: Array<number | null>,
        semanticGraph: SemanticGraph,
        moduleMap: GraphModuleMap,
        moduleMaskByNodeId: Map<number, ModuleSet>,
        supportNodeIds: number[]
    ): NeighborContext {
        const neighborModules = new ModuleSet(moduleMap.modules);

        for (const nodeId of supportNodeIds) {
            neighborModules.addSet(this.getModuleMask(
                semanticGraph,
                moduleMap,
                moduleMaskByNodeId,
                nodeId
            ));
        }

        return new NeighborContext(neighborIndices, neighborModules);
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
        const mask = new ModuleSet(moduleMap.modules);

        for (const leafNodeId of semanticGraph.graph.getLeafNodeIds(nodeId)) {
            const module = moduleMap.moduleByGraphNodeId.get(leafNodeId);

            if (!module) {
                throw new Error(`Module not found for graph node "${leafNodeId}".`);
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
                slots,
                Direction.Back
            );

            this.initializeModuleHealthForDirection(
                slot,
                slots,
                Direction.Forward
            );
        }
    }

    private initializeModuleHealthForDirection(
        slot: SemanticSlot,
        slots: SemanticSlot[],
        direction: Direction
    ): void {
        const neighborIndex = slot.neighborContext.getNeighborIndex(direction);

        if (neighborIndex === null) {
            return;
        }

        const neighbor = slots[neighborIndex];

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

    private hasSupport(
        slot: SemanticSlot,
        module: Module,
        neighbor: SemanticSlot,
        neighborModule: Module,
        direction: Direction
    ): boolean {
        return slot.neighborContext.hasTransition(
            module,
            neighborModule,
            direction
        ) || neighbor.neighborContext.hasTransition(
            module,
            neighborModule,
            direction
        );
    }
}
