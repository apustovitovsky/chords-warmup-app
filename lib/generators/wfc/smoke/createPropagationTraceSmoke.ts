import {
    chordOptions,
    chordPatternCollection,
    formOptions,
    formPatternCollection,
    rootInput,
} from "./chordPatternSmokeData";
import { RuntimeHistory, type RuntimeHistoryItem } from "../runtime/runtimeHistory";
import { PropagationSolver } from "../runtime/propagationSolver";
import type { RuntimeNode } from "../runtime/runtimeNode";
import {
    createPassGraph,
    dim,
    formatModuleLabel,
    formatModuleSet,
    getModuleIdByValue,
    green,
    buildPassGraph,
    printGraphDomains,
    type PassGraph,
} from "./multipassSmokeHelpers";

const collapseNodeIndex = 5;
const collapseModuleValue = "F";

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
const consistencySolver = new PropagationSolver(chordPass.graph);
const propagator = new PropagationSolver(chordPass.graph, history);

consistencySolver.enforceConsistency();
const beforeSnapshot = createRuntimeSnapshot(chordPass.graph.nodes);
const moduleId = getModuleIdByValue(
    chordPass.domainBuild,
    chordPass.graph.nodes[collapseNodeIndex].modules,
    collapseModuleValue
);

console.log("\npropagation trace smoke");
console.log(
    `\ncollapse node ${collapseNodeIndex} -> ${formatModuleLabel(chordPass.domainBuild, moduleId)}`
);

printGraphDomains("before", chordPass);

propagator.collapse(collapseNodeIndex, moduleId);

const item = history.peek();

if (!item) {
    throw new Error("Expected runtime history item after collapse.");
}

printHistoryItem("history diff", chordPass, item);
printGraphDomains("after propagation", chordPass);

history.rollbackLast(chordPass.graph);

printGraphDomains("after rollback", chordPass);
assertRuntimeSnapshotEqual(beforeSnapshot, createRuntimeSnapshot(chordPass.graph.nodes));
console.log(`\n${green("rollback restored runtime state")}`);

function printHistoryItem(
    title: string,
    passGraph: PassGraph,
    item: RuntimeHistoryItem
): void {
    console.log(`\n${title}:`);
    console.log(`  collapsed node: ${item.collapsedNodeIndex}`);
    console.log(`  previous collapse: ${formatNullableModule(passGraph, item.previousCollapsedModuleId)}`);
    console.log(`  selected module: ${formatModuleLabel(passGraph.domainBuild, item.collapsedModuleId)}`);

    for (const [nodeIndex, removedModules] of item.removedModulesByNodeIndex) {
        console.log(
            `  remove from ${dim(`${nodeIndex}.`)} ${formatModuleSet(passGraph.domainBuild, removedModules)}`
        );
    }
}

function formatNullableModule(
    passGraph: PassGraph,
    moduleId: number | null
): string {
    return moduleId === null
        ? dim("null")
        : formatModuleLabel(passGraph.domainBuild, moduleId);
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

        for (let direction = 0; direction < expectedNode.moduleHealth.length; direction++) {
            for (
                let moduleId = 0;
                moduleId < expectedNode.moduleHealth[direction].length;
                moduleId++
            ) {
                const expectedHealth = expectedNode.moduleHealth[direction][moduleId];
                const actualHealth = actualNode.moduleHealth[direction][moduleId];

                if (expectedHealth !== actualHealth) {
                    throw new Error(
                        `Runtime health was not restored after rollback for node "${nodeIndex}", direction "${direction}", module "${moduleId}": expected ${expectedHealth}, actual ${actualHealth}.`
                    );
                }
            }
        }
    }
}
