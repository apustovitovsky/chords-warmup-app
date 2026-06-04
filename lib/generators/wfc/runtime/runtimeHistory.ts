import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import { RingBuffer } from "./helpers/ringBuffer";
import type { RuntimeSlot } from "./runtimeSlot";

export const defaultRuntimeHistoryCapacity = 3000;

export interface RuntimeHistoryItem {
    collapsedSlotIndex: number;
    previousCollapsedModuleId: number | null;
    collapsedModuleId: number;
    removedModulesBySlotIndex: Map<number, ModuleSet>;
}

export class RuntimeHistory {
    private readonly items: RingBuffer<RuntimeHistoryItem>;

    constructor(
        readonly moduleCapacity: number,
        readonly capacity = defaultRuntimeHistoryCapacity
    ) {
        this.items = new RingBuffer(capacity);
    }

    beginStep(
        slotIndex: number,
        previousCollapsedModuleId: number | null,
        collapsedModuleId: number
    ): RuntimeHistoryItem {
        const item: RuntimeHistoryItem = {
            collapsedSlotIndex: slotIndex,
            previousCollapsedModuleId,
            collapsedModuleId,
            removedModulesBySlotIndex: new Map(),
        };

        this.items.push(item);

        return item;
    }

    recordRemoval(slotIndex: number, removedModules: ModuleSet): void {
        if (removedModules.empty) {
            return;
        }

        const item = this.peek();

        if (!item) {
            return;
        }

        let target = item.removedModulesBySlotIndex.get(slotIndex);

        if (!target) {
            target = new ModuleSet(this.moduleCapacity);
            item.removedModulesBySlotIndex.set(slotIndex, target);
        }

        target.addSet(removedModules);
    }

    peek(): RuntimeHistoryItem | null {
        return this.items.peek();
    }

    pop(): RuntimeHistoryItem | null {
        return this.items.pop();
    }

    rollbackLast(slots: RuntimeSlot[]): RuntimeHistoryItem | null {
        const item = this.pop();

        if (!item) {
            return null;
        }

        for (const [slotIndex, removedModules] of item.removedModulesBySlotIndex) {
            this.addModules(slots, slotIndex, removedModules);
        }

        slots[item.collapsedSlotIndex].collapsedModuleId =
            item.previousCollapsedModuleId;

        return item;
    }

    get count(): number {
        return this.items.count;
    }

    get empty(): boolean {
        return this.items.empty;
    }

    private addModules(
        slots: RuntimeSlot[],
        slotIndex: number,
        modulesToAdd: ModuleSet
    ): void {
        const slot = slots[slotIndex];
        const addedModules = slot.addModules(modulesToAdd);

        for (const moduleId of addedModules) {
            this.restoreNeighborHealth(slots, slot, moduleId, Direction.Back);
            this.restoreNeighborHealth(slots, slot, moduleId, Direction.Forward);
        }
    }

    private restoreNeighborHealth(
        slots: RuntimeSlot[],
        slot: RuntimeSlot,
        moduleId: number,
        direction: Direction
    ): void {
        const neighborContext = slot.neighbors[direction];

        if (!neighborContext) {
            return;
        }

        const neighbor = slots[neighborContext.slotIndex];
        const neighborDirection = Direction.opposite(direction);
        const supportedModules = neighborContext.supportedModules[moduleId];

        for (const neighborModuleId of supportedModules) {
            neighbor.moduleHealth[neighborDirection][neighborModuleId]++;
        }
    }
}
