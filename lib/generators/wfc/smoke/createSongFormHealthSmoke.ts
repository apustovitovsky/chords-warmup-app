import { createSemanticGraph } from "../hierarchy/semanticGraph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import { createRuntimeSlots } from "../runtimeSlotBuilder";
import { printSemanticHealth } from "./semanticHealthPrinter";
import { songFormLibrary, songFormSegments } from "./songFormSmokeData";

const semanticGraph = createSemanticGraph(songFormLibrary);
const moduleIndex = createSemanticModuleIndex(songFormLibrary, semanticGraph);
const layout = createSemanticLayout(
    songFormSegments,
    semanticGraph,
    { supportOverlap: 1 }
);
const slots = createRuntimeSlots(layout, moduleIndex);

printSemanticHealth(
    "song form health",
    semanticGraph.graph,
    layout,
    moduleIndex,
    slots
);
