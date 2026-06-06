import { createSemanticGraph } from "../hierarchy/semanticGraph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { CollapseQueue } from "../runtime/collapseQueue";
import { CollapseSolver } from "../runtime/collapseSolver";
import { PropagationSolver } from "../runtime/propagationSolver";
import { RuntimeHistory, type RuntimeHistoryItem } from "../runtime/runtimeHistory";
import { createRuntimeGraph } from "../runtime/runtimeCompiler";
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
    { domainOverlap: 1 }
);
const runtimeGraph = createRuntimeGraph(layout, moduleIndex);
const nodes = runtimeGraph.nodes;
const history = new RuntimeHistory(moduleIndex.modules.length);
const propagator = new PropagationSolver(runtimeGraph, history);
const queue = new CollapseQueue(runtimeGraph);
const solver = new CollapseSolver(runtimeGraph);

console.log("\ncollapse pipeline smoke");

propagator.enforceConsistency();
queue.initialize();

printSemanticHealth(
    "semantic slot health: initial",
    semanticGraph.graph,
    layout,
    moduleIndex,
    runtimeGraph,
    { printSupport: false }
);

let step = 1;
let candidate = queue.nextCandidate();

while (candidate !== null) {
    const moduleId = solver.pickModule(candidate);
    const nodeIndex = candidate.nodeIndex;
    const changedNodeIndices = propagator.collapse(nodeIndex, moduleId);
    const historyItem = history.peek();

    console.log(
        `\n${green(`collapse step ${step}`)}: ${formatSlotPath(nodeIndex)} -> ${formatModuleLabel(moduleIndex, moduleId)}`
    );
    if (historyItem) {
        printHistoryDiff(historyItem);
    }

    printChangedDomains(changedNodeIndices);

    queue.updateMany(changedNodeIndices);
    candidate = queue.nextCandidate();
    step++;
}

printSemanticHealth(
    "semantic slot health: final",
    semanticGraph.graph,
    layout,
    moduleIndex,
    runtimeGraph,
    { printSupport: false }
);

console.log(`\n${green("collapse pipeline complete")}`);

function printHistoryDiff(item: RuntimeHistoryItem): void {
    console.log(`  ${dim("selected")}: ${formatModuleLabel(moduleIndex, item.collapsedModuleId)}`);

    for (const [nodeIndex, removedModules] of item.removedModulesByNodeIndex) {
        console.log(
            `  ${red("remove")} ${dim(`${nodeIndex}.`)} ${cyan(formatSlotPath(nodeIndex))}: ${formatModuleTags(moduleIndex, removedModules)}`
        );
    }
}

function printChangedDomains(nodeIndices: number[]): void {
    console.log(`  ${dim("changed domains")}:`);

    for (const nodeIndex of nodeIndices) {
        console.log(
            `    ${dim(`${nodeIndex}.`)} ${cyan(formatSlotPath(nodeIndex))}: ${formatModuleTags(moduleIndex, nodes[nodeIndex].modules)}`
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
