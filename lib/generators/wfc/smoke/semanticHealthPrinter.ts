import type { Graph } from "../legacy/hierarchy/graph";
import type { SemanticLayout } from "../legacy/semanticLayout";
import type { SemanticModuleIndex } from "../legacy/semanticModuleIndex";
import type { RuntimeGraph } from "../runtime/runtimeGraph";
import type { ModuleSet } from "../runtime/moduleSet";
import { Direction, type Direction as DirectionType } from "../runtime/direction";

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
                runtimeGraph,
                nodeIndex,
                Direction.Back,
                moduleId,
            );
            const forwardSupport = getSupportedNeighborTags(
                moduleIndex,
                runtimeGraph,
                nodeIndex,
                Direction.Forward,
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
    runtimeGraph: RuntimeGraph,
    nodeIndex: number,
    direction: DirectionType,
    moduleId: number,
): string {
    const neighbor = runtimeGraph.nodes[nodeIndex].neighbors[direction];

    if (!neighbor) {
        return dim("x");
    }

    return formatModuleTags(
        moduleIndex,
        neighbor.supportedModules[moduleId]
    );
}

function formatCompiledSupportTags(
    moduleIndex: SemanticModuleIndex,
    runtimeGraph: RuntimeGraph,
    nodeIndex: number
): string {
    const support = new Set<string>();

    for (const neighbor of runtimeGraph.nodes[nodeIndex].neighbors) {
        if (!neighbor) {
            continue;
        }

        for (const supportedModules of neighbor.supportedModules) {
            for (const moduleId of supportedModules) {
                support.add(formatModuleLabel(moduleIndex, moduleId));
            }
        }
    }

    return [...support].join(", ") || red("-");
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
