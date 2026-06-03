import type { Module } from "./module";
import { ModuleSet } from "./moduleSet";
import type { Graph } from "./graph/graph";
import { Direction } from "./direction";
import type { PatternLibrary } from "./graph/patternLibrary";
import type { SemanticGraph } from "./graph/semanticGraph";

export interface GraphModuleMap {
    modules: Module[];
    moduleByGraphNodeId: Map<number, Module>;
    graphNodeIdByModuleId: Map<number, number>;
}

export function createGraphModules(
    graph: Graph<string>,
    nodeIds: number[]
): GraphModuleMap {
    const moduleByGraphNodeId = new Map<number, Module>();
    const graphNodeIdByModuleId = new Map<number, number>();

    const modules: Module[] = nodeIds.map((nodeId, index) => {
        const node = graph.nodes[nodeId];

        const module = {
            id: index,
            tag: node.payload,
            possibleNeighbors: [],
            neighborWeights: [],
        };

        moduleByGraphNodeId.set(node.id, module);
        graphNodeIdByModuleId.set(module.id, node.id);

        return module;
    });

    initializeModules(modules);

    return {
        modules,
        moduleByGraphNodeId,
        graphNodeIdByModuleId,
    };
}

function initializeModules(modules: Module[]): void {
    for (const module of modules) {
        module.possibleNeighbors = [
            new ModuleSet(modules),
            new ModuleSet(modules),
        ];

        module.neighborWeights = [
            new Array(modules.length).fill(0),
            new Array(modules.length).fill(0),
        ];
    }
}

export function createPatternValueModules(
    library: PatternLibrary,
    semanticGraph: SemanticGraph
): GraphModuleMap {
    const graph = semanticGraph.graph;
    const rootNode = graph.rootNode;

    if (!rootNode) {
        throw new Error("Cannot create pattern value modules from an empty graph.");
    }

    const result = createGraphModules(
        graph,
        graph.getLeafNodeIds(rootNode.id)
    );

    configureNeighbors(library, semanticGraph, result.moduleByGraphNodeId);

    return result;
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
    library: PatternLibrary,
    semanticGraph: SemanticGraph,
    moduleByGraphNodeId: Map<number, Module>
): void {
    for (const pattern of library.patterns) {
        for (const patternTag of pattern.tags) {
            const valueIdsBySectionTag =
                semanticGraph.valueIdsByPatternTagAndSectionTag.get(patternTag);

            if (!valueIdsBySectionTag) {
                throw new Error(`Pattern tag "${patternTag}" not found in graph.`);
            }

            for (const section of pattern.sections) {
                for (const sectionTag of section.tags) {
                    const valueIdsByLabel = valueIdsBySectionTag.get(sectionTag);

                    if (!valueIdsByLabel) {
                        throw new Error(
                            `Section tag "${sectionTag}" not found for pattern tag "${patternTag}".`
                        );
                    }

                    configureSectionNeighbors(
                        patternTag,
                        sectionTag,
                        section.chords,
                        valueIdsByLabel,
                        moduleByGraphNodeId
                    );
                }
            }
        }
    }
}

function configureSectionNeighbors(
    patternTag: string,
    sectionTag: string,
    chords: string[],
    valueIdsByLabel: Map<string, number>,
    moduleByGraphNodeId: Map<number, Module>
): void {
    for (let index = 0; index < chords.length - 1; index++) {
        const currentChord = chords[index];
        const nextChord = chords[index + 1];

        const currentModule = getModuleForValue(
            patternTag,
            sectionTag,
            currentChord,
            valueIdsByLabel,
            moduleByGraphNodeId
        );

        const nextModule = getModuleForValue(
            patternTag,
            sectionTag,
            nextChord,
            valueIdsByLabel,
            moduleByGraphNodeId
        );

        currentModule.possibleNeighbors[Direction.Forward].add(nextModule);
        currentModule.neighborWeights[Direction.Forward][nextModule.id]++;

        nextModule.possibleNeighbors[Direction.Back].add(currentModule);
        nextModule.neighborWeights[Direction.Back][currentModule.id]++;
    }
}

function getModuleForValue(
    patternTag: string,
    sectionTag: string,
    value: string,
    valueIdsByLabel: Map<string, number>,
    moduleByGraphNodeId: Map<number, Module>
): Module {
    const graphNodeId = valueIdsByLabel.get(value);

    if (graphNodeId === undefined) {
        throw new Error(
            `Value "${value}" not found for "${patternTag}/${sectionTag}".`
        );
    }

    return getModuleForGraphNode(graphNodeId, moduleByGraphNodeId);
}

