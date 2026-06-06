import type { Graph } from "../hierarchy/graph";
import type { SemanticLayout } from "../semanticLayout";
import type { SemanticModuleIndex } from "../semanticModuleIndex";
import type { RuntimeEdge } from "../runtime/runtimeEdge";
import type { RuntimeGraph } from "../runtime/runtimeGraph";
import type { ModuleSet } from "../runtime/moduleSet";

export function printSemanticHealth(
    title: string,
    graph: Graph<string>,
    layout: SemanticLayout,
    moduleIndex: SemanticModuleIndex,
    runtimeGraph: RuntimeGraph,
    options: {
        printSupport?: boolean;
    } = {}
): void {
    console.log(`\n${title}`);

    for (let nodeIndex = 0; nodeIndex < runtimeGraph.nodes.length; nodeIndex++) {
        const node = runtimeGraph.nodes[nodeIndex];

        console.log(`\n${dim(`${nodeIndex}.`)} ${cyan(formatGraphPath(graph, layout.slots[nodeIndex].nodeId))}`);
        console.log(`  ${green("domain")}: ${formatModuleTags(moduleIndex, node.modules)}`);

        if (options.printSupport === false) {
            continue;
        }

        console.log(`  ${dim("support")}: ${formatCompiledSupportTags(moduleIndex, runtimeGraph, nodeIndex)}`);

        for (const moduleId of node.modules) {
            const backSupport = getSupportedNeighborTags(
                moduleIndex,
                runtimeGraph.edges[nodeIndex],
                nodeIndex - 1,
                moduleId,
            );
            const forwardSupport = getSupportedNeighborTags(
                moduleIndex,
                runtimeGraph.edges[nodeIndex],
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
    edges: RuntimeEdge[],
    targetNodeIndex: number,
    moduleId: number,
): string {
    const edge = edges.find((edge) =>
        edge.targetNodeIndex === targetNodeIndex
    );

    if (!edge) {
        return dim("x");
    }

    return formatWeightedModuleTags(
        moduleIndex,
        edge.getSupportedModules(moduleId),
        edge.transitions.weights[moduleId]
    );
}

function formatCompiledSupportTags(
    moduleIndex: SemanticModuleIndex,
    runtimeGraph: RuntimeGraph,
    nodeIndex: number
): string {
    const support = new Set<string>();

    for (const edge of runtimeGraph.edges[nodeIndex]) {
        for (const supportedModules of edge.transitions.modules) {
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
