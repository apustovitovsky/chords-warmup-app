import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import { RemovalQueue } from "./removalQueue";
import type { RuntimeHistory } from "./runtimeHistory";
import type { RuntimeData } from "./runtimeData";
import type { RuntimeSlot } from "./runtimeSlot";

export class PropagationSolver {
    private readonly queue: RemovalQueue;
    private readonly moduleCapacity: number;

    constructor(
        private readonly runtimeData: RuntimeData,
        private readonly history: RuntimeHistory | null = null
    ) {
        this.moduleCapacity = runtimeData.moduleWeights.weights.length;
        this.queue = new RemovalQueue(this.moduleCapacity);
    }

    enqueue(slotIndex: number, modules: ModuleSet): void {
        this.queue.enqueue(slotIndex, modules);
    }

    collapse(slotIndex: number, moduleId: number): number[] {
        const changedSlotIndices = new Set<number>();
        const slot = this.runtimeData.slots[slotIndex];
        this.history?.beginStep(
            slotIndex,
            slot.collapsedModuleId,
            moduleId
        );

        const removedModules = slot.collapse(moduleId);
        this.history?.recordRemoval(slotIndex, removedModules);
        changedSlotIndices.add(slotIndex);

        this.propagateRemovedModules(slotIndex, removedModules);
        this.propagate(true, changedSlotIndices);

        return [...changedSlotIndices];
    }

    enforceConsistency(): number[] {
        const changedSlotIndices = new Set<number>();

        for (
            let slotIndex = 0;
            slotIndex < this.runtimeData.slots.length;
            slotIndex++
        ) {
            const slot = this.runtimeData.slots[slotIndex];
            const modulesToRemove = this.getUnsupportedModules(slot);

            this.queue.enqueue(slotIndex, modulesToRemove);
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
            this.propagateRemoval(
                event.slotIndex,
                event.modules,
                recordHistory,
                changedSlotIndices
            );
            event = this.queue.dequeue();
        }

        return [...changedSlotIndices];
    }

    removeModules(slotIndex: number, modulesToRemove: ModuleSet): number[] {
        const changedSlotIndices = new Set<number>();

        this.queue.enqueue(slotIndex, modulesToRemove);
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
        const slot = this.runtimeData.slots[slotIndex];
        const removedModules = slot.removeModules(modulesToRemove);

        if (recordHistory) {
            this.history?.recordRemoval(slotIndex, removedModules);
        }

        return removedModules;
    }

    private propagateRemoval(
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
        this.propagateRemovedModules(slotIndex, removedModules);
    }

    private propagateRemovedModules(
        slotIndex: number,
        removedModules: ModuleSet
    ): void {
        this.propagateRemovedModulesToNeighbor(
            slotIndex,
            removedModules,
            Direction.Back
        );
        this.propagateRemovedModulesToNeighbor(
            slotIndex,
            removedModules,
            Direction.Forward
        );
    }

    private propagateRemovedModulesToNeighbor(
        slotIndex: number,
        removedModules: ModuleSet,
        direction: Direction
    ): void {
        const slot = this.runtimeData.slots[slotIndex];
        const neighborContext = slot.neighbors[direction];

        if (!neighborContext) {
            return;
        }

        const neighbor = this.runtimeData.slots[neighborContext.slotIndex];
        const neighborDirection = Direction.opposite(direction);
        const modulesToRemove = new ModuleSet(this.moduleCapacity);

        for (const removedModuleId of removedModules) {
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

        this.queue.enqueue(neighborContext.slotIndex, modulesToRemove);
    }
}
