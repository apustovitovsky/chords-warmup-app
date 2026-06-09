import {
    chordOptions,
    chordPatternCollection,
    formOptions,
    formPatternCollection,
    rootInput,
} from "./chordPatternSmokeData";
import { CollapseQueue } from "../runtime/collapseQueue";
import { CollapseSolver } from "../runtime/collapseSolver";
import { PropagationSolver } from "../runtime/propagationSolver";
import { RuntimeHistory, type RuntimeHistoryItem } from "../runtime/runtimeHistory";
import {
    buildPassGraph,
    createPassGraph,
    dim,
    formatModuleLabel,
    formatModuleSet,
    green,
    printGraphDomains,
    red,
    type PassGraph,
} from "./multipassSmokeHelpers";

const form = buildPassGraph(
    formPatternCollection,
    rootInput,
    formOptions
);
const chordPass = createPassGraph(
    chordPatternCollection,
    form.collapsed,
    chordOptions
);
const history = new RuntimeHistory(chordPass.graph.moduleCapacity);
const propagator = new PropagationSolver(chordPass.graph, history);
const queue = new CollapseQueue(chordPass.graph);
const solver = new CollapseSolver(chordPass.graph);

console.log("\ncollapse pipeline smoke");

propagator.enforceConsistency();
queue.initialize();

printGraphDomains("runtime domains: initial", chordPass);

let step = 1;
let nodeIndex = queue.nextNodeIndex();

while (nodeIndex !== null) {
    const moduleId = solver.pickModule(nodeIndex);
    const changedNodeIndices = propagator.collapse(nodeIndex, moduleId);
    const historyItem = history.peek();

    console.log(
        `\n${green(`collapse step ${step}`)}: node ${nodeIndex} -> ${formatModuleLabel(chordPass.domainBuild, moduleId)}`
    );

    if (historyItem) {
        printHistoryDiff(chordPass, historyItem);
    }

    printChangedDomains(chordPass, changedNodeIndices);

    queue.updateMany(changedNodeIndices);
    nodeIndex = queue.nextNodeIndex();
    step++;
}

printGraphDomains("runtime domains: final", chordPass);
console.log(`\n${green("collapse pipeline complete")}`);

function printHistoryDiff(
    passGraph: PassGraph,
    item: RuntimeHistoryItem
): void {
    console.log(`  ${dim("selected")}: ${formatModuleLabel(passGraph.domainBuild, item.collapsedModuleId)}`);

    for (const [nodeIndexToPrint, removedModules] of item.removedModulesByNodeIndex) {
        console.log(
            `  ${red("remove")} ${dim(`${nodeIndexToPrint}.`)} ${formatModuleSet(passGraph.domainBuild, removedModules)}`
        );
    }
}

function printChangedDomains(
    passGraph: PassGraph,
    nodeIndices: number[]
): void {
    console.log(`  ${dim("changed domains")}:`);

    for (const nodeIndexToPrint of nodeIndices) {
        console.log(
            `    ${dim(`${nodeIndexToPrint}.`)} ${formatModuleSet(passGraph.domainBuild, passGraph.graph.nodes[nodeIndexToPrint].modules)}`
        );
    }
}
