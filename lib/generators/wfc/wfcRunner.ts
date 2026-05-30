import { buildModules } from "./moduleBuilder.ts";
import { Direction } from "./direction.ts";

const PatternGroups = [
    {
        tags: ["intro", "verse"],
        patterns: [
            { id: "basic-1", tags: ["C", "Gb", "Am", "Fm"] },
            { id: "basic-2", tags: ["Cm", "Am", "Fm", "G"] },

        ]
    },
    {
        tags: ["verse", "chorus"],
        patterns: [
            { id: "basic-3", tags: ["C", "Am", "Dm", "Gb"] },
            { id: "basic-4", tags: ["Db", "B", "Cm", "Ab"] },
        ]
    },
    {
        tags: ["outro", "verse"],
        patterns: [
            { id: "basic-5", tags: ["D", "Bb", "Gm", "Fm"] },
            { id: "basic-6", tags: ["Cm", "Bb", "Ab", "E"] },
        ]
    }
];

const result = buildModules(PatternGroups);
const modules = result.modules;

for (const module of modules) {
    console.log(`${module.id}. ${module.tag}`);

    const previous = module.possibleNeighbors[Direction.Previous]
        .toArray()
        .map((neighbor) => formatNeighbor(module, Direction.Previous, neighbor.id));

    const next = module.possibleNeighbors[Direction.Next]
        .toArray()
        .map((neighbor) => formatNeighbor(module, Direction.Next, neighbor.id));

    console.log(`  previous: ${previous.join(", ") || "-"}`);
    console.log(`  next: ${next.join(", ") || "-"}`);
}

for (const constraint of result.constraints) {
    const direction = constraint.direction === null
        ? "any"
        : constraint.direction === Direction.Previous
            ? "previous"
            : "next";

    console.log(
        `${constraint.id} ${direction}: ${constraint.mask.toArray().map((module) => module.tag).join(", ")}`
    );
}

function formatNeighbor(
    module: (typeof modules)[number],
    direction: Direction,
    neighborIndex: number
): string {
    const neighbor = modules[neighborIndex];
    const weight = module.neighborWeights[direction][neighborIndex];

    return `${neighbor.tag}(${weight})`;
}