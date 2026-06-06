import { Direction } from "./direction";
import { ModuleSet } from "./moduleSet";
import {
    RuntimeEdge,
    RuntimeGraph,
    type EdgeTransitionData,
} from "./runtimeGraph";
import { RuntimeNode } from "./runtimeNode";
import { SemanticNeighborContext } from "../semanticNeighborContext";
import type { SemanticModuleIndex } from "../semanticModuleIndex";
import type { SemanticLayout, SemanticLayoutSlot } from "../semanticLayout";

interface RuntimeNodeDraft {
    modules: ModuleSet;
    adjacentNodeIndices: Array<number | null>;
    semanticNeighborContext: SemanticNeighborContext;
}

interface RuntimeEdgeDraft {
    targetNodeIndex: number;
    direction: Direction;
    transitions: EdgeTransitionData;
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
        const edgeDrafts = this.createEdgeDrafts(drafts);
        const edges = this.createEdges(edgeDrafts);
        const nodes = drafts.map((draft, nodeIndex) => new RuntimeNode(
            draft.modules,
            edges[nodeIndex].length
        ));
        const runtimeGraph = new RuntimeGraph(
            nodes,
            edges,
            nodes.map((_, nodeIndex) => nodeIndex),
            semanticModuleIndex.modules.length
        );

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
                adjacentNodeIndices: this.getAdjacentNodeIndices(layout.slots, nodeIndex),
                semanticNeighborContext: semanticModuleIndex.createNeighborContext(
                    layoutSlot.supportNodeIds
                ),
            });
        }

        return drafts;
    }

    private createEdgeDrafts(drafts: RuntimeNodeDraft[]): RuntimeEdgeDraft[][] {
        return drafts.map((draft) => {
            const edgeDrafts: RuntimeEdgeDraft[] = [];

            for (const direction of [Direction.Back, Direction.Forward]) {
                const targetNodeIndex = draft.adjacentNodeIndices[direction];

                if (targetNodeIndex === null) {
                    continue;
                }

                edgeDrafts.push({
                    targetNodeIndex,
                    direction,
                    transitions: this.createEdgeTransitionData(
                        draft,
                        drafts[targetNodeIndex],
                        direction
                    ),
                });
            }

            return edgeDrafts;
        });
    }

    private createEdges(
        edgeDrafts: RuntimeEdgeDraft[][]
    ): RuntimeEdge[][] {
        return edgeDrafts.map((nodeEdgeDrafts, sourceNodeIndex) =>
            nodeEdgeDrafts.map((edgeDraft) => new RuntimeEdge(
                edgeDraft.targetNodeIndex,
                this.getReverseEdgeIndex(
                    edgeDrafts,
                    sourceNodeIndex,
                    edgeDraft.targetNodeIndex
                ),
                edgeDraft.transitions
            ))
        );
    }

    private getReverseEdgeIndex(
        edgeDrafts: RuntimeEdgeDraft[][],
        sourceNodeIndex: number,
        targetNodeIndex: number
    ): number {
        const reverseEdgeIndex = edgeDrafts[targetNodeIndex].findIndex(
            (edgeDraft) => edgeDraft.targetNodeIndex === sourceNodeIndex
        );

        if (reverseEdgeIndex < 0) {
            throw new Error(
                `Runtime edge "${sourceNodeIndex}" -> "${targetNodeIndex}" has no reverse edge.`
            );
        }

        return reverseEdgeIndex;
    }

    private createEdgeTransitionData(
        draft: RuntimeNodeDraft,
        neighbor: RuntimeNodeDraft,
        direction: Direction
    ): EdgeTransitionData {
        const modules = this.createEmptyModuleSets(draft.modules);
        const weights = this.createEmptyTransitionWeights(draft.modules);

        for (const moduleId of draft.modules) {
            const supported = modules[moduleId];
            const moduleWeights = weights[moduleId];

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
                    moduleWeights[neighborModuleId] = weight;
                }
            }
        }

        return {
            modules,
            weights,
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

    private getAdjacentNodeIndices(
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
        const edges = runtimeGraph.edges[nodeIndex];

        for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
            const edge = edges[edgeIndex];
            const targetNode = runtimeGraph.nodes[edge.targetNodeIndex];
            const reverseEdge =
                runtimeGraph.edges[edge.targetNodeIndex][edge.reverseEdgeIndex];

            for (const moduleId of node.modules) {
                let health = 0;

                for (const targetModuleId of targetNode.modules) {
                    const targetSupports =
                        reverseEdge.getSupportedModules(targetModuleId);

                    if (targetSupports.contains(moduleId)) {
                        health++;
                    }
                }

                node.moduleHealth[edgeIndex][moduleId] = health;
            }
        }
    }
}
