import { ModuleSet } from "../runtime/moduleSet";
import { RuntimeGraph } from "../runtime/runtimeGraph";
import { RuntimeNode } from "../runtime/runtimeNode";
import type { SemanticModuleIndex } from "./semanticModuleIndex";
import type { SemanticLayout, SemanticLayoutSlot } from "./semanticLayout";
import { RuntimeEdge } from "../runtime/runtimeEdge";

interface RuntimeNodeDraft {
    modules: ModuleSet;
    adjacentNodeIndices: Array<number | null>;
}

interface RuntimeEdgeDraft {
    targetNodeIndex: number;
    supportedModules: ModuleSet[];
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
        const edgeDrafts = this.createEdgeDrafts(drafts, semanticModuleIndex);
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
            const moduleMask = semanticModuleIndex.getModuleMaskForNodeIds(
                layoutSlot.domainNodeIds
            );

            drafts.push({
                modules: moduleMask,
                adjacentNodeIndices: this.getAdjacentNodeIndices(layout.slots, nodeIndex),
            });
        }

        return drafts;
    }

    private createEdgeDrafts(
        drafts: RuntimeNodeDraft[],
        semanticModuleIndex: SemanticModuleIndex
    ): RuntimeEdgeDraft[][] {
        return drafts.map((draft) => {
            const edgeDrafts: RuntimeEdgeDraft[] = [];

            for (const targetNodeIndex of draft.adjacentNodeIndices) {

                if (targetNodeIndex === null) {
                    continue;
                }

                edgeDrafts.push({
                    targetNodeIndex,
                    supportedModules: this.createSupportedModules(
                        draft,
                        drafts[targetNodeIndex],
                        semanticModuleIndex
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
                edgeDraft.supportedModules
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

    private createSupportedModules(
        draft: RuntimeNodeDraft,
        neighbor: RuntimeNodeDraft,
        semanticModuleIndex: SemanticModuleIndex
    ): ModuleSet[] {
        const modules = this.createEmptyModuleSets(draft.modules);

        for (const moduleId of draft.modules) {
            const supported = modules[moduleId];

            for (const neighborModuleId of neighbor.modules) {
                const weight = this.getTransitionWeight(
                    semanticModuleIndex,
                    moduleId,
                    neighborModuleId
                );

                if (weight > 0) {
                    supported.add(neighborModuleId);
                }
            }
        }

        return modules;
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

    private getTransitionWeight(
        semanticModuleIndex: SemanticModuleIndex,
        moduleId: number,
        neighborModuleId: number
    ): number {
        return semanticModuleIndex.getTransitionWeight(
            moduleId,
            neighborModuleId
        );
    }

    private getAdjacentNodeIndices(
        slots: SemanticLayoutSlot[],
        slotIndex: number
    ): Array<number | null> {
        return [
            slots[slotIndex - 1] ? slotIndex - 1 : null,
            slots[slotIndex + 1] ? slotIndex + 1 : null,
        ];
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

                node.setModuleHealth(edgeIndex, moduleId, health);
            }
        }
    }
}
