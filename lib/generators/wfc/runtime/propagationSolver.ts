import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import { PropagationQueue } from "./propagationQueue";
import type { RemovalEvent } from "./removalEvent";
import type { RuntimeSlot } from "./runtimeSlot";

export class PropagationSolver {
    private readonly queue = new PropagationQueue();

    constructor(
        private readonly slots: RuntimeSlot[],
        private readonly moduleCapacity: number
    ) { }

    enqueue(event: RemovalEvent): void {
        this.queue.enqueue(event);
    }

    collapse(slotIndex: number, moduleId: number): void {
        const slot = this.slots[slotIndex];
        const removedModules = slot.collapse(moduleId);

        this.queue.enqueue({
            slotIndex,
            modules: removedModules,
        });

        this.propagate();
    }

    propagate(): void {
        let event = this.queue.dequeue();

        while (event !== null) {
            this.propagateRemoval(event);
            event = this.queue.dequeue();
        }
    }

    removeModules(slotIndex: number, modulesToRemove: ModuleSet): void {
        const slot = this.slots[slotIndex];
        const removedModules = slot.removeModules(modulesToRemove);

        this.queue.enqueue({
            slotIndex,
            modules: removedModules,
        });

        this.propagate();
    }

    private propagateRemoval(event: RemovalEvent): void {
        this.propagateRemovalToNeighbor(event, Direction.Back);
        this.propagateRemovalToNeighbor(event, Direction.Forward);
    }

    private propagateRemovalToNeighbor(
        event: RemovalEvent,
        direction: Direction
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
                if (!neighbor.modules.contains(neighborModuleId)) {
                    continue;
                }

                neighbor.moduleHealth[neighborDirection][neighborModuleId]--;

                if (neighbor.moduleHealth[neighborDirection][neighborModuleId] === 0) {
                    modulesToRemove.add(neighborModuleId);
                }

                if (neighbor.moduleHealth[neighborDirection][neighborModuleId] < 0) {
                    throw new Error(
                        `Module health became negative for "${neighborModuleId}".`
                    );
                }
            }
        }

        const removedModules = neighbor.removeModules(modulesToRemove);

        this.queue.enqueue({
            slotIndex: neighborContext.slotIndex,
            modules: removedModules,
        });
    }
}
