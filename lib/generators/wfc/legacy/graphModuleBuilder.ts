import type { Module } from "./module";
import type { Graph } from "./hierarchy/graph";
import type { SemanticGraph } from "./hierarchy/semanticGraph";
import {
    expandSemanticLevels,
    type SemanticHierarchy,
} from "./hierarchy/semanticHierarchy";
import { SemanticModuleIndex } from "./semanticModuleIndex";

interface GraphModuleMap {
    modules: Module[];
    moduleByGraphNodeId: Map<number, Module>;
    graphNodeIdByModuleId: Map<number, number>;
    tagByModuleId: string[];
    transitions: ModuleTransition[];
}

export interface ModuleTransition {
    fromModuleId: number;
    toModuleId: number;
}

export function createGraphModules(
    graph: Graph<string>,
    nodeIds: number[]
): GraphModuleMap {
    const moduleByGraphNodeId = new Map<number, Module>();
    const graphNodeIdByModuleId = new Map<number, number>();
    const tagByModuleId: string[] = [];
    const valueIdByTag = new Map<string, number>();

    const modules: Module[] = nodeIds.map((nodeId, index) => {
        const node = graph.nodes[nodeId];
        let valueId = valueIdByTag.get(node.payload);

        if (valueId === undefined) {
            valueId = valueIdByTag.size;
            valueIdByTag.set(node.payload, valueId);
        }

        const module = {
            id: index,
            valueId,
        };

        moduleByGraphNodeId.set(node.id, module);
        graphNodeIdByModuleId.set(module.id, node.id);
        tagByModuleId[module.id] = node.payload;

        return module;
    });

    return {
        modules,
        moduleByGraphNodeId,
        graphNodeIdByModuleId,
        tagByModuleId,
        transitions: [],
    };
}

export function createSemanticModuleIndex(
    hierarchy: SemanticHierarchy,
    semanticGraph: SemanticGraph
): SemanticModuleIndex {
    const graph = semanticGraph.graph;
    const rootNode = graph.rootNode;

    if (!rootNode) {
        throw new Error("Cannot create pattern value modules from an empty graph.");
    }

    const result = createGraphModules(
        graph,
        graph.getLeafNodeIds(rootNode.id)
    );

    configureNeighbors(hierarchy, semanticGraph, result);

    return new SemanticModuleIndex(
        semanticGraph,
        result.modules,
        result.moduleByGraphNodeId,
        result.graphNodeIdByModuleId,
        result.tagByModuleId,
        result.transitions
    );
}

function getModuleForGraphNode(
    graphNodeId: number,
    moduleByGraphNodeId: Map<number, Module>
): Module {
    const module = moduleByGraphNodeId.get(graphNodeId);

    if (!module) {
        throw new Error(`Module not found for graph node "${graphNodeId}".`);
    }

    return module;
}

function configureNeighbors(
    hierarchy: SemanticHierarchy,
    semanticGraph: SemanticGraph,
    result: GraphModuleMap
): void {
    for (const pattern of hierarchy.patterns) {
        for (const path of expandSemanticLevels(pattern.levels)) {
            configurePathNeighbors(
                semanticGraph,
                path,
                pattern.values,
                result
            );
        }
    }
}

function configurePathNeighbors(
    semanticGraph: SemanticGraph,
    path: string[],
    values: string[],
    result: GraphModuleMap
): void {
    const pathNodeId = getGraphNodeIdByPath(semanticGraph, path);

    for (let index = 0; index < values.length - 1; index++) {
        const currentValue = values[index];
        const nextValue = values[index + 1];

        const currentModule = getModuleForValue(
            semanticGraph,
            pathNodeId,
            currentValue,
            result.moduleByGraphNodeId
        );

        const nextModule = getModuleForValue(
            semanticGraph,
            pathNodeId,
            nextValue,
            result.moduleByGraphNodeId
        );

        result.transitions.push({
            fromModuleId: currentModule.id,
            toModuleId: nextModule.id,
        });
        result.transitions.push({
            fromModuleId: nextModule.id,
            toModuleId: currentModule.id,
        });
    }
}

function getModuleForValue(
    semanticGraph: SemanticGraph,
    parentNodeId: number,
    value: string,
    moduleByGraphNodeId: Map<number, Module>
): Module {
    const valueNode = semanticGraph.graph
        .getChildNodes(parentNodeId)
        .find((node) => node.payload === value);

    if (!valueNode) {
        throw new Error(`Value "${value}" not found in semantic graph.`);
    }

    return getModuleForGraphNode(valueNode.id, moduleByGraphNodeId);
}

function getGraphNodeIdByPath(
    semanticGraph: SemanticGraph,
    path: string[]
): number {
    const rootNode = semanticGraph.graph.rootNode;

    if (!rootNode) {
        throw new Error("Cannot resolve path from an empty semantic graph.");
    }

    let nodeId = rootNode.id;

    for (const segment of path) {
        const childNode = semanticGraph.graph
            .getChildNodes(nodeId)
            .find((node) => node.payload === segment);

        if (!childNode) {
            throw new Error(`Semantic path not found: "${path.join("/")}".`);
        }

        nodeId = childNode.id;
    }

    return nodeId;
}

