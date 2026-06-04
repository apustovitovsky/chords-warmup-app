import { createSemanticGraph } from "../hierarchy/semanticGraph";
import type { Graph } from "../hierarchy/graph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { createRuntimeSlots } from "../runtimeSlotBuilder";
import { RuntimeHistory } from "../runtime/runtimeHistory";
import { PropagationSolver } from "../runtime/propagationSolver";
import type { ModuleSet } from "../runtime/moduleSet";
import type { RuntimeSlot } from "../runtime/runtimeSlot";
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
    { supportOverlap: 1 }
);
const slots = createRuntimeSlots(layout, moduleIndex);
const history = new RuntimeHistory(moduleIndex.modules.length);
const propagator = new PropagationSolver(
    slots,
    moduleIndex.modules.length,
    history
);
const beforeSnapshot = createRuntimeSnapshot(slots);
const moduleId = getModuleIdByTag(
    moduleIndex,
    slots[collapseSlotIndex].modules,
    collapseModuleTag
);

console.log("\npropagation trace smoke");
console.log(`\ncollapse ${formatSlotPath(semanticGraph.graph, layout, collapseSlotIndex)} -> ${formatModuleLabel(moduleIndex, moduleId)}`);

printDomains("before", semanticGraph.graph, layout, moduleIndex, slots);

propagator.collapse(collapseSlotIndex, moduleId);

const item = history.peek();

if (!item) {
    throw new Error("Expected runtime history item after collapse.");
}

printHistoryItem("history diff", semanticGraph.graph, layout, moduleIndex, item);
printDomains("after propagation", semanticGraph.graph, layout, moduleIndex, slots);

history.rollbackLast(slots);

printDomains("after rollback", semanticGraph.graph, layout, moduleIndex, slots);
assertRuntimeSnapshotEqual(beforeSnapshot, createRuntimeSnapshot(slots));
console.log(`\n${green("rollback restored runtime state")}`);

function printDomains(
    title: string,
    graph: Graph<string>,
    layout: SemanticLayout,
    moduleIndex: SemanticModuleIndex,
    slots: RuntimeSlot[]
): void {
    console.log(`\n${title}:`);

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        console.log(
            `  ${dim(`${slotIndex}.`)} ${cyan(formatSlotPath(graph, layout, slotIndex))}: ${formatModuleSet(moduleIndex, slots[slotIndex].modules)}`
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
    console.log(`  collapsed slot: ${item.collapsedSlotIndex}`);
    console.log(`  previous collapse: ${formatNullableModule(moduleIndex, item.previousCollapsedModuleId)}`);
    console.log(`  selected module: ${formatModuleLabel(moduleIndex, item.collapsedModuleId)}`);

    for (const [slotIndex, removedModules] of item.removedModulesBySlotIndex) {
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

interface RuntimeSlotSnapshot {
    moduleIds: number[];
    collapsedModuleId: number | null;
    moduleHealth: number[][];
}

function createRuntimeSnapshot(slots: RuntimeSlot[]): RuntimeSlotSnapshot[] {
    return slots.map((slot) => ({
        moduleIds: slot.modules.toIds(),
        collapsedModuleId: slot.collapsedModuleId,
        moduleHealth: slot.moduleHealth.map((health) => [...health]),
    }));
}

function assertRuntimeSnapshotEqual(
    expected: RuntimeSlotSnapshot[],
    actual: RuntimeSlotSnapshot[]
): void {
    for (let slotIndex = 0; slotIndex < expected.length; slotIndex++) {
        const expectedSlot = expected[slotIndex];
        const actualSlot = actual[slotIndex];

        if (JSON.stringify(expectedSlot.moduleIds) !== JSON.stringify(actualSlot.moduleIds)) {
            throw new Error(`Runtime modules were not restored after rollback for slot "${slotIndex}".`);
        }

        if (expectedSlot.collapsedModuleId !== actualSlot.collapsedModuleId) {
            throw new Error(`Runtime collapse state was not restored after rollback for slot "${slotIndex}".`);
        }

        for (let direction = 0; direction < expectedSlot.moduleHealth.length; direction++) {
            for (
                let moduleId = 0;
                moduleId < expectedSlot.moduleHealth[direction].length;
                moduleId++
            ) {
                const expectedHealth = expectedSlot.moduleHealth[direction][moduleId];
                const actualHealth = actualSlot.moduleHealth[direction][moduleId];

                if (expectedHealth !== actualHealth) {
                    throw new Error(
                        `Runtime health was not restored after rollback for slot "${slotIndex}", direction "${direction}", module "${moduleId}": expected ${expectedHealth}, actual ${actualHealth}.`
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
