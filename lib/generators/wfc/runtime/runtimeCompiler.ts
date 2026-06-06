import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import type { RuntimeGraph, RuntimeNeighbor } from "./runtimeGraph";
import { RuntimeNode } from "./runtimeNode";
import { SemanticNeighborContext } from "../semanticNeighborContext";
import type { SemanticModuleIndex } from "../semanticModuleIndex";
import type { SemanticLayout, SemanticLayoutSlot } from "../semanticLayout";

interface RuntimeNodeDraft {
    modules: ModuleSet;
    neighborIndices: Array<number | null>;
    semanticNeighborContext: SemanticNeighborContext;
}

interface RuntimeNeighborDraft {
    nodeIndex: number;
    direction: Direction;
    supportedModules: ModuleSet[];
    transitionWeights: number[][];
}

interface CompiledNeighborSupport {
    supportedModules: ModuleSet[];
    transitionWeights: number[][];
}

export function createRuntimeGraph(
    layout: SemanticLayout,
    semanticModuleIndex: SemanticModuleIndex
): RuntimeGraph {
    const compiler = new RuntimeCompiler();

    return compiler.build(layout, semanticModuleIndex);
}

class RuntimeCompiler {
    build(
        layout: SemanticLayout,
        semanticModuleIndex: SemanticModuleIndex
    ): RuntimeGraph {
        const drafts = this.createDrafts(layout, semanticModuleIndex);
        const neighborDrafts = this.createNeighborDrafts(drafts);
        const neighbors = this.createNeighbors(neighborDrafts);
        const nodes = drafts.map((draft, nodeIndex) => new RuntimeNode(
            draft.modules,
            neighbors[nodeIndex].length
        ));
        const runtimeGraph = {
            nodes,
            neighbors,
            order: nodes.map((_, nodeIndex) => nodeIndex),
            moduleCapacity: semanticModuleIndex.modules.length,
        };

        this.initializeModuleHealth(runtimeGraph);

        return runtimeGraph;
    }

    private createDrafts(
        layout: SemanticLayout,
        semanticModuleIndex: SemanticModuleIndex
    ): RuntimeNodeDraft[] {
        const drafts: RuntimeNodeDraft[] = [];

        for (let nodeIndex = 0; nodeIndex < layout.slots.length; nodeIndex++) {
            const layoutSlot = layout.slots[nodeIndex];
            const moduleMask = semanticModuleIndex.getModuleMask(layoutSlot.nodeId);

            drafts.push({
                modules: moduleMask.clone(),
                neighborIndices: this.getNeighborIndices(layout.slots, nodeIndex),
                semanticNeighborContext: semanticModuleIndex.createNeighborContext(
                    layoutSlot.supportNodeIds
                ),
            });
        }

        return drafts;
    }

    private createNeighborDrafts(drafts: RuntimeNodeDraft[]): RuntimeNeighborDraft[][] {
        return drafts.map((draft) => {
            const neighborDrafts: RuntimeNeighborDraft[] = [];

            for (const direction of [Direction.Back, Direction.Forward]) {
                const nodeIndex = draft.neighborIndices[direction];

                if (nodeIndex === null) {
                    continue;
                }

                neighborDrafts.push({
                    nodeIndex,
                    direction,
                    ...this.createCompiledNeighborSupport(
                        draft,
                        drafts[nodeIndex],
                        direction
                    ),
                });
            }

            return neighborDrafts;
        });
    }

    private createNeighbors(
        neighborDrafts: RuntimeNeighborDraft[][]
    ): RuntimeNeighbor[][] {
        return neighborDrafts.map((nodeNeighborDrafts, sourceNodeIndex) =>
            nodeNeighborDrafts.map((neighborDraft) => ({
                nodeIndex: neighborDraft.nodeIndex,
                reverseNeighborIndex: this.getReverseNeighborIndex(
                    neighborDrafts,
                    sourceNodeIndex,
                    neighborDraft.nodeIndex
                ),
                supportedModules: neighborDraft.supportedModules,
                transitionWeights: neighborDraft.transitionWeights,
            }))
        );
    }

    private getReverseNeighborIndex(
        neighborDrafts: RuntimeNeighborDraft[][],
        sourceNodeIndex: number,
        targetNodeIndex: number
    ): number {
        const reverseNeighborIndex = neighborDrafts[targetNodeIndex].findIndex(
            (neighborDraft) => neighborDraft.nodeIndex === sourceNodeIndex
        );

        if (reverseNeighborIndex < 0) {
            throw new Error(
                `Runtime neighbor "${sourceNodeIndex}" -> "${targetNodeIndex}" has no reverse edge.`
            );
        }

        return reverseNeighborIndex;
    }

    private createCompiledNeighborSupport(
        draft: RuntimeNodeDraft,
        neighbor: RuntimeNodeDraft,
        direction: Direction
    ): CompiledNeighborSupport {
        const supportedModules = this.createEmptyModuleSets(draft.modules);
        const transitionWeights = this.createEmptyTransitionWeights(draft.modules);

        for (const moduleId of draft.modules) {
            const supported = supportedModules[moduleId];
            const weights = transitionWeights[moduleId];

            for (const neighborModuleId of neighbor.modules) {
                const weight = this.getTransitionWeight(
                    draft,
                    moduleId,
                    neighbor,
                    neighborModuleId,
                    direction
                );

                if (weight > 0) {
                    supported.add(neighborModuleId);
                    weights[neighborModuleId] = weight;
                }
            }
        }

        return {
            supportedModules,
            transitionWeights,
        };
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

    private createEmptyTransitionWeights(source: ModuleSet): number[][] {
        const result: number[][] = [];

        for (let moduleId = 0; moduleId < source.capacity; moduleId++) {
            result[moduleId] = new Array(source.capacity).fill(0);
        }

        return result;
    }

    private getTransitionWeight(
        draft: RuntimeNodeDraft,
        moduleId: number,
        neighbor: RuntimeNodeDraft,
        neighborModuleId: number,
        direction: Direction
    ): number {
        return draft.semanticNeighborContext.getTransitionWeight(
            moduleId,
            neighborModuleId,
            direction
        ) + neighbor.semanticNeighborContext.getTransitionWeight(
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

    private initializeModuleHealth(runtimeGraph: RuntimeGraph): void {
        for (let nodeIndex = 0; nodeIndex < runtimeGraph.nodes.length; nodeIndex++) {
            this.initializeModuleHealthForNode(runtimeGraph, nodeIndex);
        }
    }

    private initializeModuleHealthForNode(
        runtimeGraph: RuntimeGraph,
        nodeIndex: number
    ): void {
        const node = runtimeGraph.nodes[nodeIndex];
        const neighbors = runtimeGraph.neighbors[nodeIndex];

        for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex++) {
            const neighborContext = neighbors[neighborIndex];
            const neighbor = runtimeGraph.nodes[neighborContext.nodeIndex];
            const reverseNeighborContext =
                runtimeGraph.neighbors[neighborContext.nodeIndex][neighborContext.reverseNeighborIndex];

            for (const moduleId of node.modules) {
                let health = 0;

                for (const neighborModuleId of neighbor.modules) {
                    const neighborSupports =
                        reverseNeighborContext.supportedModules[neighborModuleId];

                    if (neighborSupports.contains(moduleId)) {
                        health++;
                    }
                }

                node.moduleHealth[neighborIndex][moduleId] = health;
            }
        }
    }
}
