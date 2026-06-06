import type { Graph } from "../hierarchy/graph";
import type { SemanticLayout } from "../semanticLayout";
import type { SemanticModuleIndex } from "../semanticModuleIndex";
import type { RuntimeGraph, RuntimeNeighbor } from "../runtime/runtimeGraph";
import type { ModuleSet } from "../runtime/moduleSet";

export function printSemanticHealth(
    title: string,
    graph: Graph<string>,
    layout: SemanticLayout,
    moduleIndex: SemanticModuleIndex,
    runtimeGraph: RuntimeGraph
): void {
    console.log(`\n${title}`);

    for (let nodeIndex = 0; nodeIndex < runtimeGraph.nodes.length; nodeIndex++) {
        const node = runtimeGraph.nodes[nodeIndex];

        console.log(`\n${dim(`${nodeIndex}.`)} ${cyan(formatGraphPath(graph, layout.slots[nodeIndex].nodeId))}`);
        console.log(`  ${green("domain")}: ${formatModuleTags(moduleIndex, node.modules)}`);
        console.log(`  ${dim("support")}: ${formatCompiledSupportTags(moduleIndex, runtimeGraph, nodeIndex)}`);

        for (const moduleId of node.modules) {
            const backSupport = getSupportedNeighborTags(
                moduleIndex,
                runtimeGraph.neighbors[nodeIndex],
                nodeIndex - 1,
                moduleId,
            );
            const forwardSupport = getSupportedNeighborTags(
                moduleIndex,
                runtimeGraph.neighbors[nodeIndex],
                nodeIndex + 1,
                moduleId,
            );

            console.log(
                `  ${formatModuleLabel(moduleIndex, moduleId)}: back=[${backSupport}], forward=[${forwardSupport}]`
            );
        }
    }
}

export function formatModuleTags(
    moduleIndex: SemanticModuleIndex,
    modules: ModuleSet
): string {
    return modules.toIds()
        .map((moduleId) => formatModuleLabel(moduleIndex, moduleId))
        .join(", ") || red("-");
}

export function formatModuleLabel(
    moduleIndex: SemanticModuleIndex,
    moduleId: number
): string {
    return `${gold(moduleIndex.tagByModuleId[moduleId])}${dim(`:${moduleId}`)}`;
}

export function formatGraphPath(graph: Graph<string>, nodeId: number): string {
    const parts: string[] = [];
    let currentNode = graph.nodes[nodeId];

    while (currentNode) {
        parts.push(currentNode.payload);

        const parent = graph.getParentNodes(currentNode.id)[0];

        if (!parent) {
            break;
        }

        currentNode = parent;
    }

    return parts.reverse().join("/");
}

function getSupportedNeighborTags(
    moduleIndex: SemanticModuleIndex,
    neighbors: RuntimeNeighbor[],
    neighborNodeIndex: number,
    moduleId: number,
): string {
    const neighborContext = neighbors.find((neighbor) =>
        neighbor.nodeIndex === neighborNodeIndex
    );

    if (!neighborContext) {
        return dim("x");
    }

    return formatWeightedModuleTags(
        moduleIndex,
        neighborContext.supportedModules[moduleId],
        neighborContext.transitionWeights[moduleId]
    );
}

function formatCompiledSupportTags(
    moduleIndex: SemanticModuleIndex,
    runtimeGraph: RuntimeGraph,
    nodeIndex: number
): string {
    const support = new Set<string>();

    for (const neighborContext of runtimeGraph.neighbors[nodeIndex]) {
        for (const supportedModules of neighborContext.supportedModules) {
            for (const moduleId of supportedModules) {
                support.add(formatModuleLabel(moduleIndex, moduleId));
            }
        }
    }

    return [...support].join(", ") || red("-");
}

function formatWeightedModuleTags(
    moduleIndex: SemanticModuleIndex,
    modules: ModuleSet,
    weights: number[]
): string {
    return modules.toIds()
        .map((moduleId) =>
            `${formatModuleLabel(moduleIndex, moduleId)}${dim(`(w=${weights[moduleId]})`)}`
        )
        .join(", ") || red("-");
}

function cyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
}

function green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
}

function gold(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
}

function red(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
}

function dim(text: string): string {
    return `\x1b[90m${text}\x1b[0m`;
}
