import { createSemanticGraph } from "../hierarchy/semanticGraph";
import { CollapseSlotQueue } from "../runtime/collapseSlotQueue";
import { CollapseSolver } from "../runtime/collapseSolver";
import { MinHeap } from "../runtime/minHeap";
import { ModuleSet } from "../runtime/moduleSet";
import { createModuleWeights } from "../runtime/moduleWeights";
import { RuntimeSlot } from "../runtime/runtimeSlot";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { createRuntimeSlots } from "../runtimeSlotBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import { chordPatternLibrary, chordPatternSegments } from "./chordPatternSmokeData";

console.log("\ncollapse solver smoke");

assertMinHeapOrder();
assertCollapseSlotQueueLazyUpdate();
assertCollapseSolverResolvesSlots();

console.log(`\n${green("collapse solver smoke passed")}`);

function assertMinHeapOrder(): void {
    const heap = new MinHeap<number>((lhs, rhs) => lhs - rhs);

    heap.push(3);
    heap.push(1);
    heap.push(2);

    const values = [heap.pop(), heap.pop(), heap.pop()];

    if (JSON.stringify(values) !== JSON.stringify([1, 2, 3])) {
        throw new Error(`MinHeap returned wrong order: ${values.join(", ")}`);
    }
}

function assertCollapseSlotQueueLazyUpdate(): void {
    const moduleCapacity = 4;
    const stats = createModuleWeights(moduleCapacity);
    const slots = [
        createRuntimeSlot(moduleCapacity, [0]),
        createRuntimeSlot(moduleCapacity, [0, 1, 2]),
        createRuntimeSlot(moduleCapacity, [0, 1]),
    ];
    const queue = new CollapseSlotQueue(slots, stats);

    queue.initialize();

    const modulesToRemove = ModuleSet.fromIds(moduleCapacity, [2]);
    slots[1].removeModules(modulesToRemove);
    queue.update(1);

    const slotIndex = queue.nextSlotIndex();

    if (slotIndex !== 1) {
        throw new Error(`CollapseSlotQueue expected slot "1", got "${slotIndex}".`);
    }
}

function assertCollapseSolverResolvesSlots(): void {
    const semanticGraph = createSemanticGraph(chordPatternLibrary);
    const moduleIndex = createSemanticModuleIndex(
        chordPatternLibrary,
        semanticGraph
    );
    const layout = createSemanticLayout(
        chordPatternSegments,
        semanticGraph,
        { supportOverlap: 1 }
    );
    const slots = createRuntimeSlots(layout, moduleIndex);
    const solver = new CollapseSolver(
        slots,
        moduleIndex.modules.length,
        createModuleWeights(moduleIndex.modules.length)
    );

    solver.solve();

    const unresolvedSlotIndex = slots.findIndex((slot) =>
        slot.resolvedModuleId === null
    );

    if (unresolvedSlotIndex !== -1) {
        throw new Error(`Slot "${unresolvedSlotIndex}" was not resolved.`);
    }
}

function createRuntimeSlot(
    moduleCapacity: number,
    moduleIds: number[]
): RuntimeSlot {
    return new RuntimeSlot(
        ModuleSet.fromIds(moduleCapacity, moduleIds),
        [null, null]
    );
}

function green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
}
