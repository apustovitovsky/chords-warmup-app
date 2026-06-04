import type { Module } from "./runtime/module";
import { ModuleSet } from "./runtime/moduleSet";
import type { SemanticGraph } from "./hierarchy/semanticGraph";
import { SemanticNeighborContext } from "./semanticNeighborContext";

export class SemanticModuleIndex {
    private readonly moduleMaskByNodeId = new Map<number, ModuleSet>();

    constructor(
        private readonly semanticGraph: SemanticGraph,
        readonly modules: Module[],
        readonly moduleByGraphNodeId: Map<number, Module>,
        readonly graphNodeIdByModuleId: Map<number, number>,
        readonly tagByModuleId: string[]
    ) { }

    getModuleMask(nodeId: number): ModuleSet {
        let moduleMask = this.moduleMaskByNodeId.get(nodeId);

        if (!moduleMask) {
            moduleMask = this.createModuleMask(nodeId);
            this.moduleMaskByNodeId.set(nodeId, moduleMask);
        }

        return moduleMask;
    }

    createNeighborContext(nodeIds: number[]): SemanticNeighborContext {
        const modules = new ModuleSet(this.modules.length);

        for (const nodeId of nodeIds) {
            modules.addSet(this.getModuleMask(nodeId));
        }

        return new SemanticNeighborContext(
            this.modules,
            this.tagByModuleId,
            modules
        );
    }

    private createModuleMask(nodeId: number): ModuleSet {
        const mask = new ModuleSet(this.modules.length);

        for (const leafNodeId of this.semanticGraph.graph.getLeafNodeIds(nodeId)) {
            const module = this.moduleByGraphNodeId.get(leafNodeId);

            if (!module) {
                throw new Error(`Module not found for graph node "${leafNodeId}".`);
            }

            mask.add(module.id);
        }

        return mask;
    }
}
