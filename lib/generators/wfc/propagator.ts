import { Direction, oppositeDirection } from "./direction";
import type { Module } from "./module";
import { ModuleSet } from "./moduleSet";
import { PropagationQueue } from "./propagationQueue";
import type { RemovalEvent } from "./removalEvent";
import type { SemanticSlot } from "./semanticSlot";

export class Propagator {
    private readonly queue = new PropagationQueue();

    constructor(
        private readonly slots: SemanticSlot[],
        private readonly modules: Module[]
    ) { }

    enqueue(event: RemovalEvent): void {
        this.queue.enqueue(event);
    }

    collapse(slotIndex: number, module: Module): void {
        const slot = this.slots[slotIndex];
        const removedModules = slot.collapse(module);

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
        const neighborIndex = this.getNeighborIndex(event.slotIndex, direction);

        if (neighborIndex === null) {
            return;
        }

        const neighbor = this.slots[neighborIndex];
        const neighborDirection = oppositeDirection(direction);
        const modulesToRemove = new ModuleSet(this.modules);

        for (const removedModule of event.modules) {
            for (const possibleNeighbor of removedModule.possibleNeighbors[direction]) {
                if (!neighbor.modules.contains(possibleNeighbor)) {
                    continue;
                }

                neighbor.moduleHealth[neighborDirection][possibleNeighbor.id]--;

                if (neighbor.moduleHealth[neighborDirection][possibleNeighbor.id] === 0) {
                    modulesToRemove.add(possibleNeighbor);
                }

                if (neighbor.moduleHealth[neighborDirection][possibleNeighbor.id] < 0) {
                    throw new Error(
                        `Module health became negative for "${possibleNeighbor.tag}".`
                    );
                }
            }
        }

        const removedModules = neighbor.removeModules(modulesToRemove);

        this.queue.enqueue({
            slotIndex: neighborIndex,
            modules: removedModules,
        });
    }

    private getNeighborIndex(
        slotIndex: number,
        direction: Direction
    ): number | null {
        return this.slots[slotIndex].neighborContext.getNeighborIndex(direction);
    }
}
