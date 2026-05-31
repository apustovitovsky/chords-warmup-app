import { createModules } from "../moduleBuilder";
import { Direction } from "../direction";
import { MockCollection } from "./mockData";

const modules = createModules(MockCollection);

for (const module of modules) {
    console.log(`${module.id}. ${module.tag}`);

    const previous = module.possibleNeighbors[Direction.Back]
        .toArray()
        .map((neighbor) => formatNeighbor(module, Direction.Back, neighbor.id));

    const next = module.possibleNeighbors[Direction.Forward]
        .toArray()
        .map((neighbor) => formatNeighbor(module, Direction.Forward, neighbor.id));

    console.log(`  previous: ${previous.join(", ") || "None"}`);
    console.log(`  next: ${next.join(", ") || "None"}`);
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
