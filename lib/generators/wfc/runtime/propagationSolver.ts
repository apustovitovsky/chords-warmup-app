import { ModuleSet } from "./moduleSet";
import { RemovalQueue } from "./removalQueue";
import type { RuntimeHistory } from "./runtimeHistory";
import type { RuntimeGraph } from "./runtimeGraph";
import type { RuntimeNode } from "./runtimeNode";

export class PropagationSolver {
    private readonly queue: RemovalQueue;
    private readonly moduleCapacity: number;

    constructor(
        private readonly runtimeGraph: RuntimeGraph,
        private readonly history: RuntimeHistory | null = null
    ) {
        this.moduleCapacity = runtimeGraph.moduleCapacity;
        this.queue = new RemovalQueue(this.moduleCapacity);
    }

    enqueue(nodeIndex: number, modules: ModuleSet): void {
        this.queue.enqueue(nodeIndex, modules);
    }

    collapse(nodeIndex: number, moduleId: number): number[] {
        const changedNodeIndices = new Set<number>();
        const node = this.runtimeGraph.nodes[nodeIndex];
        this.history?.beginStep(
            nodeIndex,
            node.collapsedModuleId,
            moduleId
        );

        const removedModules = node.collapse(moduleId);
        this.history?.recordRemoval(nodeIndex, removedModules);
        changedNodeIndices.add(nodeIndex);

        this.propagateRemovedModules(nodeIndex, removedModules);
        this.propagate(true, changedNodeIndices);

        return [...changedNodeIndices];
    }

    enforceConsistency(): number[] {
        const changedNodeIndices = new Set<number>();

        for (
            let nodeIndex = 0;
            nodeIndex < this.runtimeGraph.nodes.length;
            nodeIndex++
        ) {
            const node = this.runtimeGraph.nodes[nodeIndex];
            const modulesToRemove = this.getUnsupportedModules(node);

            this.queue.enqueue(nodeIndex, modulesToRemove);
        }

        this.propagate(false, changedNodeIndices);

        return [...changedNodeIndices];
    }

    propagate(
        recordHistory = true,
        changedNodeIndices: Set<number> = new Set()
    ): number[] {
        let event = this.queue.dequeue();

        while (event !== null) {
            this.propagateRemoval(
                event.nodeIndex,
                event.modules,
                recordHistory,
                changedNodeIndices
            );
            event = this.queue.dequeue();
        }

        return [...changedNodeIndices];
    }

    removeModules(nodeIndex: number, modulesToRemove: ModuleSet): number[] {
        const changedNodeIndices = new Set<number>();

        this.queue.enqueue(nodeIndex, modulesToRemove);
        this.propagate(true, changedNodeIndices);

        return [...changedNodeIndices];
    }

    private getUnsupportedModules(node: RuntimeNode): ModuleSet {
        const modulesToRemove = new ModuleSet(this.moduleCapacity);

        for (const moduleId of node.modules) {
            for (const health of node.moduleHealth) {
                if (health[moduleId] <= 0) {
                    modulesToRemove.add(moduleId);
                    break;
                }
            }
        }

        return modulesToRemove;
    }

    private removeModulesFromSlot(
        nodeIndex: number,
        modulesToRemove: ModuleSet,
        recordHistory: boolean
    ): ModuleSet {
        const node = this.runtimeGraph.nodes[nodeIndex];
        const removedModules = node.removeModules(modulesToRemove);

        if (recordHistory) {
            this.history?.recordRemoval(nodeIndex, removedModules);
        }

        return removedModules;
    }

    private propagateRemoval(
        nodeIndex: number,
        modulesToRemove: ModuleSet,
        recordHistory: boolean,
        changedNodeIndices: Set<number>
    ): void {
        const removedModules = this.removeModulesFromSlot(
            nodeIndex,
            modulesToRemove,
            recordHistory
        );

        if (removedModules.empty) {
            return;
        }

        changedNodeIndices.add(nodeIndex);
        this.propagateRemovedModules(nodeIndex, removedModules);
    }

    private propagateRemovedModules(
        nodeIndex: number,
        removedModules: ModuleSet
    ): void {
        const neighbors = this.runtimeGraph.neighbors[nodeIndex];

        for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex++) {
            this.propagateRemovedModulesToNeighbor(
                nodeIndex,
                removedModules,
                neighborIndex
            );
        }
    }

    private propagateRemovedModulesToNeighbor(
        nodeIndex: number,
        removedModules: ModuleSet,
        neighborIndex: number
    ): void {
        const neighborContext = this.runtimeGraph.neighbors[nodeIndex][neighborIndex];
        const neighbor = this.runtimeGraph.nodes[neighborContext.nodeIndex];
        const modulesToRemove = new ModuleSet(this.moduleCapacity);

        for (const removedModuleId of removedModules) {
            const supportedModules = neighborContext.supportedModules[removedModuleId];

            for (const neighborModuleId of supportedModules) {
                neighbor.moduleHealth[neighborContext.reverseNeighborIndex][neighborModuleId]--;

                if (
                    neighbor.moduleHealth[neighborContext.reverseNeighborIndex][neighborModuleId] === 0 &&
                    neighbor.modules.contains(neighborModuleId)
                ) {
                    modulesToRemove.add(neighborModuleId);
                }

                if (neighbor.moduleHealth[neighborContext.reverseNeighborIndex][neighborModuleId] < 0) {
                    throw new Error(
                        `Module health became negative for "${neighborModuleId}".`
                    );
                }
            }
        }

        this.queue.enqueue(neighborContext.nodeIndex, modulesToRemove);
    }
}
