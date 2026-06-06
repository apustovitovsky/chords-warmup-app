import { createSemanticGraph } from "../hierarchy/semanticGraph";
import type { Graph } from "../hierarchy/graph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { createRuntimeGraph } from "../runtime/runtimeCompiler";
import { RuntimeHistory } from "../runtime/runtimeHistory";
import { PropagationSolver } from "../runtime/propagationSolver";
import type { ModuleSet } from "../runtime/moduleSet";
import type { RuntimeGraph } from "../runtime/runtimeGraph";
import type { RuntimeNode } from "../runtime/runtimeNode";
import type { SemanticLayout } from "../semanticLayout";
import type { SemanticModuleIndex } from "../semanticModuleIndex";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import { chordPatternLibrary, chordPatternSegments } from "./chordPatternSmokeData";

const collapseSlotIndex = 1;
const collapseModuleTag = "Dm";

const semanticGraph = createSemanticGraph(chordPatternLibrary);
const moduleIndex = createSemanticModuleIndex(chordPatternLibrary, semanticGraph);
const layout = createSemanticLayout(
    chordPatternSegments,
    semanticGraph,
    { domainOverlap: 1 }
);
const runtimeGraph = createRuntimeGraph(layout, moduleIndex);
const nodes = runtimeGraph.nodes;
const history = new RuntimeHistory(moduleIndex.modules.length);
new PropagationSolver(runtimeGraph).enforceConsistency();
const propagator = new PropagationSolver(
    runtimeGraph,
    history
);
const beforeSnapshot = createRuntimeSnapshot(nodes);
const moduleId = getModuleIdByTag(
    moduleIndex,
    nodes[collapseSlotIndex].modules,
    collapseModuleTag
);

console.log("\npropagation trace smoke");
console.log(`\ncollapse ${formatSlotPath(semanticGraph.graph, layout, collapseSlotIndex)} -> ${formatModuleLabel(moduleIndex, moduleId)}`);

printDomains("before", semanticGraph.graph, layout, moduleIndex, runtimeGraph);

propagator.collapse(collapseSlotIndex, moduleId);

const item = history.peek();

if (!item) {
    throw new Error("Expected runtime history item after collapse.");
}

printHistoryItem("history diff", semanticGraph.graph, layout, moduleIndex, item);
printDomains("after propagation", semanticGraph.graph, layout, moduleIndex, runtimeGraph);

history.rollbackLast(runtimeGraph);

printDomains("after rollback", semanticGraph.graph, layout, moduleIndex, runtimeGraph);
assertRuntimeSnapshotEqual(beforeSnapshot, createRuntimeSnapshot(nodes));
console.log(`\n${green("rollback restored runtime state")}`);

function printDomains(
    title: string,
    graph: Graph<string>,
    layout: SemanticLayout,
    moduleIndex: SemanticModuleIndex,
    runtimeGraph: RuntimeGraph
): void {
    console.log(`\n${title}:`);

    for (let slotIndex = 0; slotIndex < runtimeGraph.nodes.length; slotIndex++) {
        console.log(
            `  ${dim(`${slotIndex}.`)} ${cyan(formatSlotPath(graph, layout, slotIndex))}: ${formatModuleSet(moduleIndex, runtimeGraph.nodes[slotIndex].modules)}`
        );
    }
}

function printHistoryItem(
    title: string,
    graph: Graph<string>,
    layout: SemanticLayout,
    moduleIndex: SemanticModuleIndex,
    item: NonNullable<ReturnType<RuntimeHistory["peek"]>>
): void {
    console.log(`\n${title}:`);
    console.log(`  collapsed slot: ${item.collapsedNodeIndex}`);
    console.log(`  previous collapse: ${formatNullableModule(moduleIndex, item.previousCollapsedModuleId)}`);
    console.log(`  selected module: ${formatModuleLabel(moduleIndex, item.collapsedModuleId)}`);

    for (const [slotIndex, removedModules] of item.removedModulesByNodeIndex) {
        console.log(
            `  remove from ${dim(`${slotIndex}.`)} ${cyan(formatSlotPath(graph, layout, slotIndex))}: ${formatModuleSet(moduleIndex, removedModules)}`
        );
    }
}

function getModuleIdByTag(
    moduleIndex: SemanticModuleIndex,
    modules: ModuleSet,
    tag: string
): number {
    for (const moduleId of modules) {
        if (moduleIndex.tagByModuleId[moduleId] === tag) {
            return moduleId;
        }
    }

    const fallbackModuleId = modules.toIds()[0];

    if (fallbackModuleId === undefined) {
        throw new Error("Cannot select module from empty slot.");
    }

    return fallbackModuleId;
}

function formatSlotPath(
    graph: Graph<string>,
    layout: SemanticLayout,
    slotIndex: number
): string {
    return formatGraphPath(graph, layout.slots[slotIndex].nodeId);
}

function formatGraphPath(graph: Graph<string>, nodeId: number): string {
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

function formatModuleSet(
    moduleIndex: SemanticModuleIndex,
    modules: ModuleSet
): string {
    return modules.toIds()
        .map((moduleId) => formatModuleLabel(moduleIndex, moduleId))
        .join(", ") || red("-");
}

function formatNullableModule(
    moduleIndex: SemanticModuleIndex,
    moduleId: number | null
): string {
    return moduleId === null
        ? dim("null")
        : formatModuleLabel(moduleIndex, moduleId);
}

function formatModuleLabel(
    moduleIndex: SemanticModuleIndex,
    moduleId: number
): string {
    return `${gold(moduleIndex.tagByModuleId[moduleId])}${dim(`:${moduleId}`)}`;
}

interface RuntimeNodeSnapshot {
    moduleIds: number[];
    collapsedModuleId: number | null;
    moduleHealth: number[][];
}

function createRuntimeSnapshot(nodes: RuntimeNode[]): RuntimeNodeSnapshot[] {
    return nodes.map((node) => ({
        moduleIds: node.modules.toIds(),
        collapsedModuleId: node.collapsedModuleId,
        moduleHealth: node.moduleHealth.map((health) => [...health]),
    }));
}

function assertRuntimeSnapshotEqual(
    expected: RuntimeNodeSnapshot[],
    actual: RuntimeNodeSnapshot[]
): void {
    for (let nodeIndex = 0; nodeIndex < expected.length; nodeIndex++) {
        const expectedNode = expected[nodeIndex];
        const actualNode = actual[nodeIndex];

        if (JSON.stringify(expectedNode.moduleIds) !== JSON.stringify(actualNode.moduleIds)) {
            throw new Error(`Runtime modules were not restored after rollback for node "${nodeIndex}".`);
        }

        if (expectedNode.collapsedModuleId !== actualNode.collapsedModuleId) {
            throw new Error(`Runtime collapse state was not restored after rollback for node "${nodeIndex}".`);
        }

        for (let neighborIndex = 0; neighborIndex < expectedNode.moduleHealth.length; neighborIndex++) {
            for (
                let moduleId = 0;
                moduleId < expectedNode.moduleHealth[neighborIndex].length;
                moduleId++
            ) {
                const expectedHealth = expectedNode.moduleHealth[neighborIndex][moduleId];
                const actualHealth = actualNode.moduleHealth[neighborIndex][moduleId];

                if (expectedHealth !== actualHealth) {
                    throw new Error(
                        `Runtime health was not restored after rollback for node "${nodeIndex}", neighbor "${neighborIndex}", module "${moduleId}": expected ${expectedHealth}, actual ${actualHealth}.`
                    );
                }
            }
        }
    }
}

function cyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
}

function gold(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
}

function green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
}

function red(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
}

function dim(text: string): string {
    return `\x1b[90m${text}\x1b[0m`;
}
