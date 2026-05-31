import { Direction } from "../direction";
import type { Graph } from "../graph/graph";
import type { PatternLibrary } from "../graph/patternLibrary";
import { createSemanticGraph } from "../graph/semanticGraph";
import { createPatternValueModules } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import type { SemanticSectionDefinition } from "../semanticLayout";

import { createSemanticSlots } from "../semanticSlotBuilder";
import type { ModuleSet } from "../moduleSet";

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
const moduleResult = createPatternValueModules(library, semanticGraph);
const graph = semanticGraph.graph;

const slotDefinitions: SemanticSectionDefinition[] = [
    { patternTag: "genre2", sectionTag: "verse", length: 2 },
    { patternTag: "genre2", sectionTag: "chorus", length: 2 },
];

const layout = createSemanticLayout(
    slotDefinitions,
    semanticGraph
);

const slots = createSemanticSlots(
    layout,
    semanticGraph,
    moduleResult
);

console.log("\nsemantic slot health");

for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const slot = slots[slotIndex];

    console.log(`\n${slotIndex}. ${formatGraphPath(graph, slot.nodeId)}`);
    console.log(`  domain: ${formatModuleTags(slot.modules)}`);
    console.log(`  support: ${formatModuleTags(slot.supportModules)}`);

    for (const module of slot.modules) {
        const backSupport = getSupportedNeighborTags(slotIndex, module, Direction.Back);
        const forwardSupport = getSupportedNeighborTags(slotIndex, module, Direction.Forward);

        console.log(
            `  ${module.tag}: back=[${backSupport}], forward=[${forwardSupport}]`
        );
    }
}

function formatModuleTags(modules: ModuleSet): string {
    return modules.toArray()
        .map((module) => module.tag)
        .join(", ") || "-";
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
    module: typeof moduleResult.modules[number],
    direction: Direction
): string {
    const slot = slots[slotIndex];

    const neighborSlot = direction === Direction.Back
        ? slots[slotIndex - 1]
        : slots[slotIndex + 1];

    if (!neighborSlot) {
        return "-";
    }

    if (!hasSharedSupportContext(slot, neighborSlot)) {
        return "-";
    }

    const supportedTags: string[] = [];

    for (const neighborModule of neighborSlot.modules) {
        if (
            supports(slot, module, neighborSlot, neighborModule, direction)
        ) {
            supportedTags.push(neighborModule.tag);
        }
    }

    return supportedTags.join(", ") || "-";
}

function hasSharedSupportContext(
    slot: typeof slots[number],
    neighborSlot: typeof slots[number]
): boolean {
    return slot.supportNodeIds.some((nodeId) =>
        neighborSlot.supportNodeIds.includes(nodeId)
    );
}

function supports(
    slot: typeof slots[number],
    module: typeof moduleResult.modules[number],
    neighborSlot: typeof slots[number],
    neighborModule: typeof moduleResult.modules[number],
    direction: Direction
): boolean {
    return hasTagTransition(
        slot.supportModules,
        module.tag,
        neighborModule.tag,
        direction
    ) || hasTagTransition(
        neighborSlot.supportModules,
        module.tag,
        neighborModule.tag,
        direction
    );
}

function hasTagTransition(
    modules: ModuleSet,
    fromTag: string,
    toTag: string,
    direction: Direction
): boolean {
    for (const contextModule of modules) {
        if (contextModule.tag !== fromTag) {
            continue;
        }

        for (const contextNeighbor of contextModule.possibleNeighbors[direction]) {
            if (contextNeighbor.tag === toTag) {
                return true;
            }
        }
    }

    return false;
}