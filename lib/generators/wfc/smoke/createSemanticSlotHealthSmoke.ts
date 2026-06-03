import { Direction } from "../direction";
import type { Graph } from "../graph/graph";
import type { PatternLibrary } from "../graph/patternLibrary";
import { createSemanticGraph } from "../graph/semanticGraph";
import { createPatternValueModules } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import type { SemanticSegmentDefinition } from "../semanticLayout";
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

const slots = createSemanticSlots(
    layout,
    semanticGraph,
    moduleMap
);

console.log("\nsemantic slot health");

for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const slot = slots[slotIndex];

    console.log(`\n${slotIndex}. ${formatGraphPath(graph, slot.nodeId)}`);
    console.log(`  domain: ${formatModuleTags(slot.modules)}`);
    console.log(`  support: ${formatModuleTags(slot.neighborContext.modules)}`);

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
    module: typeof moduleMap.modules[number],
    direction: Direction
): string {
    const slot = slots[slotIndex];

    const neighborIndex = slot.neighborContext.getNeighborIndex(direction);

    if (neighborIndex === null) {
        return "x";
    }

    const neighborSlot = slots[neighborIndex];

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

function supports(
    slot: typeof slots[number],
    module: typeof moduleMap.modules[number],
    neighborSlot: typeof slots[number],
    neighborModule: typeof moduleMap.modules[number],
    direction: Direction
): boolean {
    return slot.neighborContext.hasTransition(
        module,
        neighborModule,
        direction
    ) || neighborSlot.neighborContext.hasTransition(
        module,
        neighborModule,
        direction
    );
}
