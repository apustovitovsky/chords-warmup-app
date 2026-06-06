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
        const edges = this.runtimeGraph.edges[nodeIndex];

        for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
            this.propagateRemovedModulesToNeighbor(
                nodeIndex,
                removedModules,
                edgeIndex
            );
        }
    }

    private propagateRemovedModulesToNeighbor(
        nodeIndex: number,
        removedModules: ModuleSet,
        edgeIndex: number
    ): void {
        const edge = this.runtimeGraph.edges[nodeIndex][edgeIndex];
        const targetNode = this.runtimeGraph.nodes[edge.targetNodeIndex];
        const targetHealth = targetNode.moduleHealth[edge.reverseEdgeIndex];
        const modulesToRemove = new ModuleSet(this.moduleCapacity);

        for (const removedModuleId of removedModules) {
            const supportedModules = edge.supportedModules[removedModuleId];

            for (const targetModuleId of supportedModules) {
                targetHealth[targetModuleId]--;

                if (
                    targetHealth[targetModuleId] === 0 &&
                    targetNode.modules.contains(targetModuleId)
                ) {
                    modulesToRemove.add(targetModuleId);
                }

                if (targetHealth[targetModuleId] < 0) {
                    throw new Error(
                        `Module health became negative for "${targetModuleId}".`
                    );
                }
            }
        }

        this.queue.enqueue(edge.targetNodeIndex, modulesToRemove);
    }
}
