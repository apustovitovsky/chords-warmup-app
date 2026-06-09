import { CollapseSolver } from "../runtime/collapseSolver";
import { DomainBuilder, type DomainBuild } from "../multipass/domainBuilder";
import { GraphBuilder } from "../multipass/graphBuilder";
import { LayoutBuilder, type LayoutBuilderOptions } from "../multipass/layoutBuilder";
import type {
    PatternCollection
} from "../multipass/patternDefinition";
import type { RuntimeGraph } from "../runtime/runtimeGraph";

const root = new Array(8).fill("root");

const formPass: PatternCollection = {
    name: "form",
    patterns: [
        {
            parentValues: ["root"],
            values: ["intro", "verse", "chorus", "verse", "outro"],
        },
        // {
        //     parentValues: ["root"],
        //     values: ["intro", "verse", "chorus", "verse", "outro"],
        // },
    ],
};

const formOptions: LayoutBuilderOptions = {
    resolution: 1,
    overlap: 0,
};

const chordPass: PatternCollection = {
    name: "chords",
    patterns: [
        {
            parentValues: ["intro"],
            values: ["C", "Am", "F"],
        },
        {
            parentValues: ["verse"],
            values: ["C", "G", "Am", "F"],
        },
        {
            parentValues: ["chorus"],
            values: ["F", "G", "C", "Am"],
        },
        {
            parentValues: ["outro"],
            values: ["F", "Fm"],
        },
    ],
};

const chordOptions: LayoutBuilderOptions = {
    resolution: 4,
    overlap: 1,
};

console.log("\nmultipass smoke");
printValues("root input", root);

const form = runPass(formPass, root, formOptions);
printGraph("form graph", form.domainBuild, form.graph);
printValues("form result", form.collapsed);

const chords = runPass(chordPass, form.collapsed, chordOptions);
printGraph("chord graph", chords.domainBuild, chords.graph);
printValues("chord result", chords.collapsed);

function runPass(
    pass: PatternCollection,
    parent: string[],
    options: LayoutBuilderOptions
): {
    domainBuild: DomainBuild;
    graph: RuntimeGraph;
    collapsed: string[];
} {
    const domainBuild = new DomainBuilder().build(pass);
    const parentDomainIds = parent.map((value) =>
        domainBuild.domainIds.get(value)
    );
    const layout = new LayoutBuilder(parentDomainIds).build(options);
    const graph = new GraphBuilder().build(layout, domainBuild.domain);
    const solver = new CollapseSolver(graph);

    solver.solve();

    return {
        domainBuild,
        graph,
        collapsed: domainBuild.decoder.decode(graph),
    };
}

function printGraph(
    title: string,
    domainBuild: DomainBuild,
    graph: RuntimeGraph
): void {
    console.log(`\n${green(title)}`);

    for (
        let nodeIndex = 0;
        nodeIndex < graph.nodes.length;
        nodeIndex++
    ) {
        const node = graph.nodes[nodeIndex];

        console.log(
            `  ${dim(`${nodeIndex}.`)} ${formatModuleIds(domainBuild, node.modules.toIds())}`
        );
    }
}

function printValues(title: string, values: string[]): void {
    console.log(`\n${green(title)}`);

    for (let index = 0; index < values.length; index++) {
        console.log(`  ${dim(`${index}.`)} ${gold(values[index])}`);
    }
}

function formatModuleIds(
    domainBuild: DomainBuild,
    moduleIds: number[]
): string {
    return moduleIds
        .map((moduleId) =>
            `${gold(domainBuild.decoder.formatModule(moduleId))}${dim(`:${moduleId}`)}`
        )
        .join(", ") || red("-");
}

function green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
}

function gold(value: unknown): string {
    return `\x1b[33m${String(value)}\x1b[0m`;
}

function red(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
}

function dim(text: string): string {
    return `\x1b[90m${text}\x1b[0m`;
}
