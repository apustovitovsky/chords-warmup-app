import { ModuleSet } from "./moduleSet";
import { RingBuffer } from "./helpers/ringBuffer";
import { Direction, type Direction as DirectionType } from "./direction";
import type { RuntimeGraph } from "./runtimeGraph";

export const defaultRuntimeHistoryCapacity = 3000;

export interface RuntimeHistoryItem {
    collapsedNodeIndex: number;
    previousCollapsedModuleId: number | null;
    collapsedModuleId: number;
    removedModulesByNodeIndex: Map<number, ModuleSet>;
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
        nodeIndex: number,
        previousCollapsedModuleId: number | null,
        collapsedModuleId: number
    ): RuntimeHistoryItem {
        const item: RuntimeHistoryItem = {
            collapsedNodeIndex: nodeIndex,
            previousCollapsedModuleId,
            collapsedModuleId,
            removedModulesByNodeIndex: new Map(),
        };

        this.items.push(item);

        return item;
    }

    recordRemoval(nodeIndex: number, removedModules: ModuleSet): void {
        if (removedModules.empty) {
            return;
        }

        const item = this.peek();

        if (!item) {
            return;
        }

        let target = item.removedModulesByNodeIndex.get(nodeIndex);

        if (!target) {
            target = new ModuleSet(this.moduleCapacity);
            item.removedModulesByNodeIndex.set(nodeIndex, target);
        }

        target.addSet(removedModules);
    }

    peek(): RuntimeHistoryItem | null {
        return this.items.peek();
    }

    pop(): RuntimeHistoryItem | null {
        return this.items.pop();
    }

    rollbackLast(runtimeGraph: RuntimeGraph): RuntimeHistoryItem | null {
        const item = this.pop();

        if (!item) {
            return null;
        }

        for (const [nodeIndex, removedModules] of item.removedModulesByNodeIndex) {
            this.addModules(runtimeGraph, nodeIndex, removedModules);
        }

        runtimeGraph.nodes[item.collapsedNodeIndex].collapsedModuleId =
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
        runtimeGraph: RuntimeGraph,
        nodeIndex: number,
        modulesToAdd: ModuleSet
    ): void {
        const node = runtimeGraph.nodes[nodeIndex];
        const addedModules = node.addModules(modulesToAdd);

        for (const moduleId of addedModules) {
            this.restoreNeighborHealth(runtimeGraph, nodeIndex, moduleId);
        }
    }

    private restoreNeighborHealth(
        runtimeGraph: RuntimeGraph,
        nodeIndex: number,
        moduleId: number
    ): void {
        const node = runtimeGraph.nodes[nodeIndex];

        for (
            let direction = 0;
            direction < Direction.count;
            direction++
        ) {
            const neighbor = node.neighbors[direction];

            if (!neighbor) {
                continue;
            }

            const targetNode = runtimeGraph.nodes[neighbor.nodeIndex];
            const supportedModules = neighbor.supportedModules[moduleId];

            for (const targetModuleId of supportedModules) {
                targetNode.incrementModuleHealth(
                    Direction.opposite(direction as DirectionType),
                    targetModuleId
                );
            }
        }
    }
}
