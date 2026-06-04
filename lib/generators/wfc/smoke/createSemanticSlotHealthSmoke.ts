import { createSemanticGraph } from "../hierarchy/semanticGraph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import { createRuntimeSlots } from "../runtimeSlotBuilder";
import { chordPatternLibrary, chordPatternSegments } from "./chordPatternSmokeData";
import { printSemanticHealth } from "./semanticHealthPrinter";

const semanticGraph = createSemanticGraph(chordPatternLibrary);
const moduleIndex = createSemanticModuleIndex(chordPatternLibrary, semanticGraph);
const layout = createSemanticLayout(
    chordPatternSegments,
    semanticGraph,
    { supportOverlap: 1 }
);
const slots = createRuntimeSlots(layout, moduleIndex);

printSemanticHealth(
    "semantic slot health",
    semanticGraph.graph,
    layout,
    moduleIndex,
    slots
);
