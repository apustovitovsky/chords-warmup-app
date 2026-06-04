import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import { PropagationQueue } from "./propagationQueue";
import type { RemovalEvent } from "./removalEvent";
import type { RuntimeHistory } from "./runtimeHistory";
import type { RuntimeSlot } from "./runtimeSlot";

export class PropagationSolver {
    private readonly queue = new PropagationQueue();

    constructor(
        private readonly slots: RuntimeSlot[],
        private readonly moduleCapacity: number,
        private readonly history: RuntimeHistory | null = null
    ) { }

    enqueue(event: RemovalEvent): void {
        this.queue.enqueue(event);
    }

    collapse(slotIndex: number, moduleId: number): number[] {
        const changedSlotIndices = new Set<number>();
        const slot = this.slots[slotIndex];
        this.history?.beginStep(
            slotIndex,
            slot.collapsedModuleId,
            moduleId
        );

        const removedModules = slot.collapse(moduleId);
        this.history?.recordRemoval(slotIndex, removedModules);
        changedSlotIndices.add(slotIndex);

        this.queue.enqueue({
            slotIndex,
            modules: removedModules,
        });

        this.propagate(true, changedSlotIndices);

        return [...changedSlotIndices];
    }

    enforceConsistency(): number[] {
        const changedSlotIndices = new Set<number>();

        for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
            const slot = this.slots[slotIndex];
            const modulesToRemove = this.getUnsupportedModules(slot);

            this.removeAndEnqueue(
                slotIndex,
                modulesToRemove,
                false,
                changedSlotIndices
            );
        }

        this.propagate(false, changedSlotIndices);

        return [...changedSlotIndices];
    }

    propagate(
        recordHistory = true,
        changedSlotIndices: Set<number> = new Set()
    ): number[] {
        let event = this.queue.dequeue();

        while (event !== null) {
            this.propagateRemoval(event, recordHistory, changedSlotIndices);
            event = this.queue.dequeue();
        }

        return [...changedSlotIndices];
    }

    removeModules(slotIndex: number, modulesToRemove: ModuleSet): number[] {
        const changedSlotIndices = new Set<number>();

        this.removeAndEnqueue(
            slotIndex,
            modulesToRemove,
            true,
            changedSlotIndices
        );
        this.propagate(true, changedSlotIndices);

        return [...changedSlotIndices];
    }

    private getUnsupportedModules(slot: RuntimeSlot): ModuleSet {
        const modulesToRemove = new ModuleSet(this.moduleCapacity);

        for (const moduleId of slot.modules) {
            for (const direction of [Direction.Back, Direction.Forward]) {
                if (!slot.neighbors[direction]) {
                    continue;
                }

                if (slot.moduleHealth[direction][moduleId] <= 0) {
                    modulesToRemove.add(moduleId);
                    break;
                }
            }
        }

        return modulesToRemove;
    }

    private removeModulesFromSlot(
        slotIndex: number,
        modulesToRemove: ModuleSet,
        recordHistory: boolean
    ): ModuleSet {
        const slot = this.slots[slotIndex];
        const removedModules = slot.removeModules(modulesToRemove);

        if (recordHistory) {
            this.history?.recordRemoval(slotIndex, removedModules);
        }

        return removedModules;
    }

    private removeAndEnqueue(
        slotIndex: number,
        modulesToRemove: ModuleSet,
        recordHistory: boolean,
        changedSlotIndices: Set<number>
    ): void {
        const removedModules = this.removeModulesFromSlot(
            slotIndex,
            modulesToRemove,
            recordHistory
        );

        if (removedModules.empty) {
            return;
        }

        changedSlotIndices.add(slotIndex);

        this.queue.enqueue({
            slotIndex,
            modules: removedModules,
        });
    }

    private propagateRemoval(
        event: RemovalEvent,
        recordHistory: boolean,
        changedSlotIndices: Set<number>
    ): void {
        this.propagateRemovalToNeighbor(
            event,
            Direction.Back,
            recordHistory,
            changedSlotIndices
        );
        this.propagateRemovalToNeighbor(
            event,
            Direction.Forward,
            recordHistory,
            changedSlotIndices
        );
    }

    private propagateRemovalToNeighbor(
        event: RemovalEvent,
        direction: Direction,
        recordHistory: boolean,
        changedSlotIndices: Set<number>
    ): void {
        const slot = this.slots[event.slotIndex];
        const neighborContext = slot.neighbors[direction];

        if (!neighborContext) {
            return;
        }

        const neighbor = this.slots[neighborContext.slotIndex];
        const neighborDirection = Direction.opposite(direction);
        const modulesToRemove = new ModuleSet(this.moduleCapacity);

        for (const removedModuleId of event.modules) {
            const supportedModules = neighborContext.supportedModules[removedModuleId];

            for (const neighborModuleId of supportedModules) {
                neighbor.moduleHealth[neighborDirection][neighborModuleId]--;

                if (
                    neighbor.moduleHealth[neighborDirection][neighborModuleId] === 0 &&
                    neighbor.modules.contains(neighborModuleId)
                ) {
                    modulesToRemove.add(neighborModuleId);
                }

                if (neighbor.moduleHealth[neighborDirection][neighborModuleId] < 0) {
                    throw new Error(
                        `Module health became negative for "${neighborModuleId}".`
                    );
                }
            }
        }

        this.removeAndEnqueue(
            neighborContext.slotIndex,
            modulesToRemove,
            recordHistory,
            changedSlotIndices
        );
    }
}
