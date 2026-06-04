import type { Module } from "./runtime/module";
import { ModuleSet } from "./runtime/moduleSet";
import type { Graph } from "./hierarchy/graph";
import { Direction } from "./runtime/direction";
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
    moduleWeightById: number[];
}

export function createGraphModules(
    graph: Graph<string>,
    nodeIds: number[]
): GraphModuleMap {
    const moduleByGraphNodeId = new Map<number, Module>();
    const graphNodeIdByModuleId = new Map<number, number>();
    const tagByModuleId: string[] = [];
    const moduleWeightById: number[] = [];

    const modules: Module[] = nodeIds.map((nodeId, index) => {
        const node = graph.nodes[nodeId];

        const module = {
            id: index,
            possibleNeighbors: [],
            neighborWeights: [],
        };

        moduleByGraphNodeId.set(node.id, module);
        graphNodeIdByModuleId.set(module.id, node.id);
        tagByModuleId[module.id] = node.payload;
        moduleWeightById[module.id] = 0;

        return module;
    });

    initializeModules(modules);

    return {
        modules,
        moduleByGraphNodeId,
        graphNodeIdByModuleId,
        tagByModuleId,
        moduleWeightById,
    };
}

function initializeModules(modules: Module[]): void {
    for (const module of modules) {
        module.possibleNeighbors = [
            new ModuleSet(modules.length),
            new ModuleSet(modules.length),
        ];

        module.neighborWeights = [
            new Array(modules.length).fill(0),
            new Array(modules.length).fill(0),
        ];
    }
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
        result.moduleWeightById
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

    for (const value of values) {
        const module = getModuleForValue(
            semanticGraph,
            pathNodeId,
            value,
            result.moduleByGraphNodeId
        );

        result.moduleWeightById[module.id]++;
    }

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

        currentModule.possibleNeighbors[Direction.Forward].add(nextModule.id);
        currentModule.neighborWeights[Direction.Forward][nextModule.id]++;

        nextModule.possibleNeighbors[Direction.Back].add(currentModule.id);
        nextModule.neighborWeights[Direction.Back][currentModule.id]++;
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

