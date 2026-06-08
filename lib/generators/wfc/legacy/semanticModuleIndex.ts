import type { Module } from "./module";
import { ModuleSet } from "../runtime/moduleSet";
import type { SemanticGraph } from "./hierarchy/semanticGraph";
import type { ModuleTransition } from "./graphModuleBuilder";

export class SemanticModuleIndex {
    private readonly moduleMaskByNodeId = new Map<number, ModuleSet>();
    private readonly valueTransitionWeights = new Map<number, Map<number, number>>();

    constructor(
        private readonly semanticGraph: SemanticGraph,
        readonly modules: Module[],
        readonly moduleByGraphNodeId: Map<number, Module>,
        readonly graphNodeIdByModuleId: Map<number, number>,
        readonly tagByModuleId: string[],
        transitions: ModuleTransition[]
    ) {
        this.initializeValueTransitionWeights(transitions);
    }

    getModuleMask(nodeId: number): ModuleSet {
        let moduleMask = this.moduleMaskByNodeId.get(nodeId);

        if (!moduleMask) {
            moduleMask = this.createModuleMask(nodeId);
            this.moduleMaskByNodeId.set(nodeId, moduleMask);
        }

        return moduleMask;
    }

    getModuleMaskForNodeIds(nodeIds: number[]): ModuleSet {
        const result = new ModuleSet(this.modules.length);

        for (const nodeId of nodeIds) {
            result.addSet(this.getModuleMask(nodeId));
        }

        return result;
    }

    getTransitionWeight(fromModuleId: number, toModuleId: number): number {
        const fromValueId = this.modules[fromModuleId].valueId;
        const toValueId = this.modules[toModuleId].valueId;

        return this.valueTransitionWeights
            .get(fromValueId)
            ?.get(toValueId) ?? 0;
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

    private initializeValueTransitionWeights(
        transitions: ModuleTransition[]
    ): void {
        for (const transition of transitions) {
            const fromValueId = this.modules[transition.fromModuleId].valueId;
            const toValueId = this.modules[transition.toModuleId].valueId;
            let weights = this.valueTransitionWeights.get(fromValueId);

            if (!weights) {
                weights = new Map<number, number>();
                this.valueTransitionWeights.set(fromValueId, weights);
            }

            weights.set(toValueId, (weights.get(toValueId) ?? 0) + 1);
        }
    }
}
