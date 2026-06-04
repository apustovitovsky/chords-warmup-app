import { Direction } from "../runtime/direction";
import type { Graph } from "../hierarchy/graph";
import type { SemanticLayout } from "../semanticLayout";
import type { SemanticModuleIndex } from "../semanticModuleIndex";
import type { RuntimeSlot } from "../runtime/runtimeSlot";
import type { ModuleSet } from "../runtime/moduleSet";

export function printSemanticHealth(
    title: string,
    graph: Graph<string>,
    layout: SemanticLayout,
    moduleIndex: SemanticModuleIndex,
    slots: RuntimeSlot[]
): void {
    console.log(`\n${title}`);

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slot = slots[slotIndex];

        console.log(`\n${dim(`${slotIndex}.`)} ${cyan(formatGraphPath(graph, layout.slots[slotIndex].nodeId))}`);
        console.log(`  ${green("domain")}: ${formatModuleTags(moduleIndex, slot.modules)}`);
        console.log(`  ${dim("support")}: ${formatCompiledSupportTags(moduleIndex, slot)}`);

        for (const moduleId of slot.modules) {
            const backSupport = getSupportedNeighborTags(
                moduleIndex,
                slot,
                moduleId,
                Direction.Back
            );
            const forwardSupport = getSupportedNeighborTags(
                moduleIndex,
                slot,
                moduleId,
                Direction.Forward
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
    slot: RuntimeSlot,
    moduleId: number,
    direction: Direction
): string {
    const neighborContext = slot.neighbors[direction];

    if (!neighborContext) {
        return dim("x");
    }

    return formatModuleTags(moduleIndex, neighborContext.supportedModules[moduleId]);
}

function formatCompiledSupportTags(
    moduleIndex: SemanticModuleIndex,
    slot: RuntimeSlot
): string {
    const support = new Set<string>();

    for (const neighborContext of slot.neighbors) {
        if (!neighborContext) {
            continue;
        }

        for (const supportedModules of neighborContext.supportedModules) {
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
