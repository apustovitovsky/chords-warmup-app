import { ModuleSet } from "../runtime/moduleSet";
import { RuntimeGraph } from "../runtime/runtimeGraph";
import { RuntimeNode, type RuntimeNeighbor } from "../runtime/runtimeNode";
import { Direction, type Direction as DirectionType } from "../runtime/direction";
import type { SemanticModuleIndex } from "./semanticModuleIndex";
import type { SemanticLayout, SemanticLayoutSlot } from "./semanticLayout";

interface RuntimeNodeDraft {
    modules: ModuleSet;
    adjacentNodeIndices: Array<number | null>;
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
        const nodes = drafts.map((draft, nodeIndex) => new RuntimeNode(
            draft.modules,
            this.createNeighbors(drafts, nodeIndex, semanticModuleIndex)
        ));
        const runtimeGraph = new RuntimeGraph(
            nodes,
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

    private createNeighbors(
        drafts: RuntimeNodeDraft[],
        nodeIndex: number,
        semanticModuleIndex: SemanticModuleIndex
    ): Array<RuntimeNeighbor | null> {
        return [
            this.createNeighbor(
                drafts,
                nodeIndex,
                Direction.Back,
                semanticModuleIndex
            ),
            this.createNeighbor(
                drafts,
                nodeIndex,
                Direction.Forward,
                semanticModuleIndex
            ),
        ];
    }

    private createNeighbor(
        drafts: RuntimeNodeDraft[],
        nodeIndex: number,
        direction: DirectionType,
        semanticModuleIndex: SemanticModuleIndex
    ): RuntimeNeighbor | null {
        const targetNodeIndex = drafts[nodeIndex].adjacentNodeIndices[direction];

        if (targetNodeIndex === null) {
            return null;
        }

        return {
            nodeIndex: targetNodeIndex,
            supportedModules: this.createSupportedModules(
                drafts[nodeIndex],
                drafts[targetNodeIndex],
                direction,
                semanticModuleIndex
            ),
        };
    }

    private createSupportedModules(
        draft: RuntimeNodeDraft,
        neighbor: RuntimeNodeDraft,
        direction: DirectionType,
        semanticModuleIndex: SemanticModuleIndex
    ): ModuleSet[] {
        const modules = this.createEmptyModuleSets(draft.modules);

        for (const moduleId of draft.modules) {
            const supported = modules[moduleId];

            for (const neighborModuleId of neighbor.modules) {
                const weight = this.getTransitionWeight(
                    semanticModuleIndex,
                    moduleId,
                    neighborModuleId,
                    direction
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
        neighborModuleId: number,
        direction: DirectionType
    ): number {
        return direction === Direction.Forward
            ? semanticModuleIndex.getTransitionWeight(
                moduleId,
                neighborModuleId
            )
            : semanticModuleIndex.getTransitionWeight(
                neighborModuleId,
                moduleId
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

            for (const moduleId of node.modules) {
                let health = 0;

                for (const targetModuleId of targetNode.modules) {
                    if (neighbor.supportedModules[moduleId].contains(targetModuleId)) {
                        health++;
                    }
                }

                node.setModuleHealth(direction, moduleId, health);
            }
        }
    }
}
