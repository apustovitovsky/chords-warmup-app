import { CollapseSolver } from "../runtime/collapseSolver";
import {
    compilePatternPass,
    createCollapsedPass,
    type CompiledPatternPass,
} from "./passCompiler";
import type { CollapsedPass, PatternPass } from "./pass";

const formPass: PatternPass = {
    name: "form",
    domainOverlap: 0,
    patterns: [
        {
            parentValues: null,
            values: [
                { value: "intro", size: 2 },
                { value: "verse", size: 4 },
                { value: "outro", size: 2 },
            ],
        },
        {
            parentValues: null,
            values: [
                { value: "intro", size: 2 },
                { value: "chorus", size: 4 },
                { value: "chorus", size: 4 },
            ],
        },
    ],
};

const chordPass: PatternPass = {
    name: "chords",
    domainOverlap: 1,
    patterns: [
        {
            parentValues: ["intro", "outro"],
            values: [
                { value: "C", size: 1 },
                { value: "Am", size: 1 },
                { value: "F", size: 1 },
                { value: "Fm", size: 1 },
            ],
        },
        {
            parentValues: ["verse", "chorus"],
            values: [
                { value: "C", size: 1 },
                { value: "G", size: 1 },
                { value: "Am", size: 1 },
                { value: "F", size: 1 },
            ],
        },
    ],
};

console.log("\nmultipass smoke");

const form = runPass(formPass, null);
printCompiledPass("form graph", form.compiled);
printCollapsedPass("form result", form.collapsed);

const chords = runPass(chordPass, form.collapsed);
printCompiledPass("chord graph", chords.compiled);
printCollapsedPass("chord result", chords.collapsed);

function runPass(
    pass: PatternPass,
    parent: CollapsedPass | null
): {
    compiled: CompiledPatternPass;
    collapsed: CollapsedPass;
} {
    const compiled = compilePatternPass(pass, parent);
    const solver = new CollapseSolver(compiled.runtimeGraph);

    solver.solve();

    return {
        compiled,
        collapsed: createCollapsedPass(compiled),
    };
}

function printCompiledPass(
    title: string,
    compiled: CompiledPatternPass
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

function printCollapsedPass(title: string, pass: CollapsedPass): void {
    console.log(`\n${green(title)}`);

    for (let index = 0; index < pass.items.length; index++) {
        const item = pass.items[index];

        console.log(
            `  ${dim(`${index}.`)} ${gold(item.value)} ${dim(`[${item.startIndex}, ${item.endIndex}) size=${item.size}`)}`
        );
    }
}

function formatModuleIds(
    compiled: CompiledPatternPass,
    moduleIds: number[]
): string {
    return moduleIds
        .map((moduleId) => {
            const module = compiled.modules[moduleId];

            return `${gold(module.label)}${dim(`:${module.id}`)}`;
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
