import { Direction } from "../runtime/direction";
import type { Graph } from "../graph/graph";
import type { PatternLibrary } from "../graph/patternLibrary";
import { createSemanticGraph } from "../graph/semanticGraph";
import { createPatternValueModules } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import type { SemanticSegmentDefinition } from "../semanticLayout";
import { createRuntimeSlots } from "../runtimeSlotBuilder";
import type { ModuleSet } from "../runtime/moduleSet";

const library: PatternLibrary = {
    patterns: [
        {
            tags: ["genre1", "genre2"],
            sections: [
                {
                    tags: ["intro", "verse"],
                    chords: ["C", "C", "Am", "F"],
                },
                {
                    tags: ["verse"],
                    chords: ["F", "C", "Dm", "Bb"],
                },
                {
                    tags: ["outro", "verse"],
                    chords: ["C", "Em", "F", "Fm"],
                },
            ],
        },
        {
            tags: ["genre2", "genre3"],
            sections: [
                {
                    tags: ["verse"],
                    chords: ["C", "G", "Am", "F"],
                },
                {
                    tags: ["chorus"],
                    chords: ["Bb", "C", "Dm", "G"],
                },
                {
                    tags: ["verse"],
                    chords: ["C", "Am", "F", "Fm"],
                },
            ],
        },
    ],
};

const semanticGraph = createSemanticGraph(library);
const moduleMap = createPatternValueModules(library, semanticGraph);
const graph = semanticGraph.graph;

const slotDefinitions: SemanticSegmentDefinition[] = [
    { patternTag: "genre2", sectionTag: "verse", length: 2 },
    { patternTag: "genre3", sectionTag: "chorus", length: 2 },
    { patternTag: "genre1", sectionTag: "intro", length: 2 },
    { patternTag: "genre2", sectionTag: "outro", length: 2 },
];

const layout = createSemanticLayout(
    slotDefinitions,
    semanticGraph,
    { supportOverlap: 1 }
);

const slots = createRuntimeSlots(
    layout,
    semanticGraph,
    moduleMap
);

console.log("\nsemantic slot health");

for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const slot = slots[slotIndex];

    console.log(`\n${dim(`${slotIndex}.`)} ${cyan(formatGraphPath(graph, layout.slots[slotIndex].nodeId))}`);
    console.log(`  ${green("domain")}: ${formatModuleTags(slot.modules)}`);
    console.log(`  ${dim("support")}: ${formatCompiledSupportTags(slotIndex)}`);

    for (const moduleId of slot.modules) {
        const backSupport = getSupportedNeighborTags(slotIndex, moduleId, Direction.Back);
        const forwardSupport = getSupportedNeighborTags(slotIndex, moduleId, Direction.Forward);

        console.log(
            `  ${formatModuleLabel(moduleId)}: back=[${backSupport}], forward=[${forwardSupport}]`
        );
    }
}

function formatModuleTags(modules: ModuleSet): string {
    return modules.toIds()
        .map(formatModuleLabel)
        .join(", ") || "-";
}

function formatModuleLabel(moduleId: number): string {
    return `${gold(moduleMap.tagByModuleId[moduleId])}${dim(`:${moduleId}`)}`;
}

function formatGraphPath(graph: Graph<string>, nodeId: number): string {
    const parts: string[] = [];
    let currentNode = graph.nodes[nodeId];

    while (currentNode) {
        parts.push(currentNode.payload);

        const parent = graph.getParentNodes(currentNode.id)[0];

        if (!parent) {
            break;
        }

        currentNode = parent;
    }

    return parts.reverse().join("/");
}

function getSupportedNeighborTags(
    slotIndex: number,
    moduleId: number,
    direction: Direction
): string {
    const slot = slots[slotIndex];
    const neighborContext = slot.neighbors[direction];

    if (!neighborContext) {
        return dim("x");
    }

    return formatModuleTags(neighborContext.supportedModules[moduleId]);
}

function formatCompiledSupportTags(slotIndex: number): string {
    const slot = slots[slotIndex];
    const support = new Set<string>();

    for (const neighborContext of slot.neighbors) {
        if (!neighborContext) {
            continue;
        }

        for (const supportedModules of neighborContext.supportedModules) {
            for (const moduleId of supportedModules) {
                support.add(formatModuleLabel(moduleId));
            }
        }
    }

    return [...support].join(", ") || red("-");
}

function cyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
}

function green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
}

function gold(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
}

function red(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
}

function dim(text: string): string {
    return `\x1b[90m${text}\x1b[0m`;
}
