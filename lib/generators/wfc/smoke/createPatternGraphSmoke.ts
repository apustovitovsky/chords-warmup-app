import { createSemanticGraph } from "../graph/semanticGraph";
import type { Graph } from "../graph/graph";
import type { PatternLibrary } from "../graph/patternLibrary";
import { Direction } from "../direction";
import { createPatternValueModules } from "../graphModuleBuilder";
import { createSemanticLayout } from "../semanticLayoutBuilder";
import type { SemanticSectionDefinition } from "../semanticLayout";

import { createSemanticSlots } from "../semanticSlotBuilder";


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
                    chords: ["F", "C", "Dm", "G"],
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
const modules = moduleResult.modules;

const graph = semanticGraph.graph;

console.log("\nneighbors");
for (const module of modules) {
    const back = module.possibleNeighbors[Direction.Back].toArray()
        .map((neighbor) => {
            const weight = module.neighborWeights[Direction.Back][neighbor.id];
            return `${formatModule(graph, neighbor)}:${weight}`;
        })
        .join(", ");

    const forward = module.possibleNeighbors[Direction.Forward].toArray()
        .map((neighbor) => {
            const weight = module.neighborWeights[Direction.Forward][neighbor.id];
            return `${formatModule(graph, neighbor)}:${weight}`;
        })
        .join(", ");

    console.log(`{ ${formatModule(graph, module)}`);
    console.log(`  back: ${back || "-"}`);
    console.log(`  forward: ${forward || "-"}`);
    console.log("}");
}

const slotDefinitions: SemanticSectionDefinition[] = [
    { patternTag: "genre2", sectionTag: "verse", length: 4 },
    { patternTag: "genre3", sectionTag: "chorus", length: 4 },
    { patternTag: "genre2", sectionTag: "outro", length: 4 },
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

console.log("\nslots");
for (let index = 0; index < slots.length; index++) {
    const slot = slots[index];

    const slotModules = slot.modules.toArray()
        .map((module) => module.tag)
        .join(", ");

    console.log(`${index}. ${formatGraphPath(graph, slot.nodeId)} -> ${slotModules || "-"}`);
}


// printGraphTree(patternGraph.graph);
// printGraphNodes(patternGraph.graph);
// printLeaves(graph, "intro");
// printLeaves(graph, "verse");
// printLeaves(graph, "outro");

function printGraphTree(graph: Graph<string>): void {
    console.log("\ngraph tree");
    printNode(graph, 0, 0);
}

function printNode(
    graph: Graph<string>,
    nodeId: number,
    depth: number
): void {
    const node = graph.nodes[nodeId];
    const indent = "  ".repeat(depth);

    console.log(`${indent}- ${node.payload}:${node.id}`);

    for (const child of graph.getChildNodes(nodeId)) {
        printNode(graph, child.id, depth + 1);
    }
}

function printLeaves(graph: Graph<string>, label: string): void {
    const nodes = graph.nodes.filter((node) => node.payload === label);

    console.log(`\nleaves for ${label}`);

    for (const node of nodes) {
        const leaves = graph.getLeafNodes(node.id)
            .map((leaf) => leaf.payload)
            .join(", ");

        console.log(`  ${node.payload}:${node.id}: ${leaves || "-"}`);
    }
}

function printGraphNodes(graph: Graph<string>): void {
    console.log("\ngraph nodes");

    for (const node of graph.nodes) {
        const childIds = graph.getChildNodes(node.id)
            .map((child) => child.id)
            .join(", ");

        const parentIds = graph.getParentNodes(node.id)
            .map((parent) => parent.id)
            .join(", ");

        const parts = [
            `id: ${node.id}`,
            `payload: "${node.payload}"`,
        ];

        if (parentIds.length > 0) {
            parts.push(`parentIds: [${parentIds}]`);
        }

        if (childIds.length > 0) {
            parts.push(`childIds: [${childIds}]`);
        }

        console.log(`{ ${parts.join(", ")} }`);
    }
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

function formatModule(graph: Graph<string>, module: typeof modules[number]): string {
    if (module.graphNodeId === undefined) {
        return module.tag;
    }

    return formatGraphPath(graph, module.graphNodeId);
}