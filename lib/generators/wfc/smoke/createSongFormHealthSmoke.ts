import { createSemanticGraph } from "../hierarchy/semanticGraph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import { PropagationSolver } from "../runtime/propagationSolver";
import { createRuntimeData } from "../runtime/runtimeCompiler";
import { printSemanticHealth } from "./semanticHealthPrinter";
import { songFormLibrary, songFormSegments } from "./songFormSmokeData";

const semanticGraph = createSemanticGraph(songFormLibrary);
const moduleIndex = createSemanticModuleIndex(songFormLibrary, semanticGraph);
const layout = createSemanticLayout(
    songFormSegments,
    semanticGraph,
    { supportOverlap: 1 }
);
const runtimeData = createRuntimeData(layout, moduleIndex);
new PropagationSolver(runtimeData).enforceConsistency();
const slots = runtimeData.slots;

printSemanticHealth(
    "song form health",
    semanticGraph.graph,
    layout,
    moduleIndex,
    slots
);
