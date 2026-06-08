import { CollapseSolver } from "../runtime/collapseSolver";
import {
    compilePatternPass,
    PatternResolverOptions,
    type CompiledPattern,
} from "./patternResolver";
import type {
    PatternCollection
} from "./patternDefinition";

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

const formOptions: PatternResolverOptions = {
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

const chordOptions: PatternResolverOptions = {
    resolution: 4,
    overlap: 1,
};

console.log("\nmultipass smoke");
printValues("root input", root);

const form = runPass(formPass, root, formOptions);
printCompiledPass("form graph", form.compiled);
printValues("form result", form.collapsed);

const chords = runPass(chordPass, form.collapsed, chordOptions);
printCompiledPass("chord graph", chords.compiled);
printValues("chord result", chords.collapsed);

function runPass(
    pass: PatternCollection,
    parent: string[],
    options: PatternResolverOptions
): {
    compiled: CompiledPattern;
    collapsed: string[];
} {
    const compiled = compilePatternPass(pass, parent, options);
    const solver = new CollapseSolver(compiled.runtimeGraph);

    solver.solve();

    return {
        compiled,
        collapsed: getResolvedValues(compiled),
    };
}

function getResolvedValues(compiled: CompiledPattern): string[] {
    return compiled.runtimeGraph.nodes.map((node, nodeIndex) => {
        const moduleId = node.resolvedModuleId;

        if (moduleId === null) {
            throw new Error(`Cannot decode unresolved node "${nodeIndex}".`);
        }

        return compiled.modules[moduleId].value;
    });
}

function printCompiledPass(
    title: string,
    compiled: CompiledPattern
): void {
    console.log(`\n${green(title)}`);

    for (
        let nodeIndex = 0;
        nodeIndex < compiled.runtimeGraph.nodes.length;
        nodeIndex++
    ) {
        const node = compiled.runtimeGraph.nodes[nodeIndex];

        console.log(
            `  ${dim(`${nodeIndex}.`)} ${formatModuleIds(compiled, node.modules.toIds())}`
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
    compiled: CompiledPattern,
    moduleIds: number[]
): string {
    return moduleIds
        .map((moduleId) => {
            const module = compiled.modules[moduleId];

            return `${gold(module.value)}${dim(`:${module.id}`)}`;
        })
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
