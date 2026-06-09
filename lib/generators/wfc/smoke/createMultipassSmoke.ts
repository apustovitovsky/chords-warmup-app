import {
    chordOptions,
    chordPatternCollection,
    formOptions,
    formPatternCollection,
    rootInput,
} from "./chordPatternSmokeData";
import {
    buildPassGraph,
    printGraphDomains,
    printValues,
} from "./multipassSmokeHelpers";

console.log("\nmultipass smoke");
printValues("root input", rootInput);

const form = buildPassGraph(
    formPatternCollection,
    rootInput,
    formOptions
);
printGraphDomains("form graph", form);
printValues("form result", form.collapsed);

const chords = buildPassGraph(
    chordPatternCollection,
    form.collapsed,
    chordOptions
);
printGraphDomains("chord graph", chords);
printValues("chord result", chords.collapsed);
