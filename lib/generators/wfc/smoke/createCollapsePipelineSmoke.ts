import { createSemanticGraph } from "../hierarchy/semanticGraph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { CollapseQueue } from "../runtime/collapseQueue";
import { CollapseSolver } from "../runtime/collapseSolver";
import { PropagationSolver } from "../runtime/propagationSolver";
import { RuntimeHistory, type RuntimeHistoryItem } from "../runtime/runtimeHistory";
import { createRuntimeData } from "../runtime/runtimeCompiler";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import { chordPatternLibrary, chordPatternSegments } from "./chordPatternSmokeData";
import {
    formatGraphPath,
    formatModuleLabel,
    formatModuleTags,
    printSemanticHealth,
} from "./semanticHealthPrinter";

const semanticGraph = createSemanticGraph(chordPatternLibrary);
const moduleIndex = createSemanticModuleIndex(chordPatternLibrary, semanticGraph);
const layout = createSemanticLayout(
    chordPatternSegments,
    semanticGraph,
    { supportOverlap: 1 }
);
const runtimeData = createRuntimeData(layout, moduleIndex);
const slots = runtimeData.slots;
const history = new RuntimeHistory(moduleIndex.modules.length);
const propagator = new PropagationSolver(runtimeData, history);
const queue = new CollapseQueue(runtimeData);
const solver = new CollapseSolver(runtimeData);

console.log("\ncollapse pipeline smoke");

propagator.enforceConsistency();
queue.initialize();

printSemanticHealth(
    "semantic slot health: initial",
    semanticGraph.graph,
    layout,
    moduleIndex,
    slots
);

let step = 1;
let slotIndex = queue.nextSlotIndex();

while (slotIndex !== null) {
    const moduleId = solver.pickModule(slotIndex);
    const changedSlotIndices = propagator.collapse(slotIndex, moduleId);
    const historyItem = history.peek();

    console.log(
        `\n${green(`collapse step ${step}`)}: ${formatSlotPath(slotIndex)} -> ${formatModuleLabel(moduleIndex, moduleId)}`
    );
    console.log(`  ${dim("transition weight")}: ${solver.calculateModuleWeight(slotIndex, moduleId)}`);

    if (historyItem) {
        printHistoryDiff(historyItem);
    }

    printChangedDomains(changedSlotIndices);
    printSemanticHealth(
        `semantic slot health: after step ${step}`,
        semanticGraph.graph,
        layout,
        moduleIndex,
        slots
    );

    queue.updateMany(changedSlotIndices);
    slotIndex = queue.nextSlotIndex();
    step++;
}

console.log(`\n${green("collapse pipeline complete")}`);

function printHistoryDiff(item: RuntimeHistoryItem): void {
    console.log(`  ${dim("selected")}: ${formatModuleLabel(moduleIndex, item.collapsedModuleId)}`);

    for (const [slotIndex, removedModules] of item.removedModulesBySlotIndex) {
        console.log(
            `  ${red("remove")} ${dim(`${slotIndex}.`)} ${cyan(formatSlotPath(slotIndex))}: ${formatModuleTags(moduleIndex, removedModules)}`
        );
    }
}

function printChangedDomains(slotIndices: number[]): void {
    console.log(`  ${dim("changed domains")}:`);

    for (const slotIndex of slotIndices) {
        console.log(
            `    ${dim(`${slotIndex}.`)} ${cyan(formatSlotPath(slotIndex))}: ${formatModuleTags(moduleIndex, slots[slotIndex].modules)}`
        );
    }
}

function formatSlotPath(slotIndex: number): string {
    return formatGraphPath(
        semanticGraph.graph,
        layout.slots[slotIndex].nodeId
    );
}

function cyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
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
