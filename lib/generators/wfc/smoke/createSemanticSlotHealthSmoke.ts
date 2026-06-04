import { createSemanticGraph } from "../hierarchy/semanticGraph";
import { createSemanticModuleIndex } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import { PropagationSolver } from "../runtime/propagationSolver";
import { createRuntimeData } from "../runtime/runtimeCompiler";
import { chordPatternLibrary, chordPatternSegments } from "./chordPatternSmokeData";
import { printSemanticHealth } from "./semanticHealthPrinter";

const semanticGraph = createSemanticGraph(chordPatternLibrary);
const moduleIndex = createSemanticModuleIndex(chordPatternLibrary, semanticGraph);
const layout = createSemanticLayout(
    chordPatternSegments,
    semanticGraph,
    { supportOverlap: 1 }
);
const runtimeData = createRuntimeData(layout, moduleIndex);
const slots = runtimeData.slots;

new PropagationSolver(runtimeData).enforceConsistency();
printSemanticHealth(
    "semantic slot health",
    semanticGraph.graph,
    layout,
    moduleIndex,
    slots
);
