import { createConstraints } from "../constraintBuilder";
import { createModules } from "../moduleBuilder";
import { createSlots } from "../slotBuilder";
import { MockCollection } from "./mockData";
// import { CollapseSolver } from "../collapseSolver";
import { Propagator } from "../propagator";
import { Slot } from "../slot";
import { SectionDefinition } from "../sectionDefinition";
import { Direction } from "../direction";


const modules = createModules(MockCollection);

const sections = [
    { tags: ["intro"], length: 3 },
    { tags: ["verse"], length: 5 },
    { tags: ["outro"], length: 3 },
];

const constraints = createConstraints(
    MockCollection,
    modules,
    sections
);

const slots = createSlots(
    sections,
    modules,
    constraints
);

printSlots("before collapse", slots, sections);

const propagator = new Propagator(slots, modules);
const targetSlotIndex = 1;
const targetModule = slots[targetSlotIndex]
    .modules
    .toArray()
    .find((module) => module.tag === "G");

if (!targetModule) {
    throw new Error(`Slot ${targetSlotIndex} has no modules.`);
}

printSlotHealth("before collapse health", targetSlotIndex, slots);
printSlotHealth("before neighbor health", targetSlotIndex + 1, slots);

console.log(`\ncollapse ${targetSlotIndex} -> ${targetModule.tag}\n`);
propagator.collapse(targetSlotIndex, targetModule);

printSlotHealth("after collapse health", targetSlotIndex, slots);
printSlotHealth("after neighbor health", targetSlotIndex + 1, slots);

printSlots("after collapse", slots, sections);

// const solver = new CollapseSolver(slots, modules);
// solver.solve();

function printSlots(
    title: string,
    slots: Slot[],
    sections: SectionDefinition[]
): void {
    console.log(`\n${title}`);

    let slotIndex = 0;

    for (const section of sections) {
        for (let index = 0; index < section.length; index++) {
            const slot = slots[slotIndex];
            const slotModules = slot.resolvedModule?.tag
                ?? slot.modules.toArray().map((module) => module.tag).join(", ");

            const totalLength = slots.length;

            const boundary =
                totalLength === 1
                    ? " single"
                    : slotIndex === 0
                        ? " boundary:start"
                        : slotIndex === totalLength - 1
                            ? " boundary:end"
                            : "";

            console.log(
                `${slotIndex}: ${section.tags.join("+")}${boundary} -> ${slotModules}`
            );

            slotIndex++;
        }
    }
}

function printSlotHealth(
    title: string,
    slotIndex: number,
    slots: Slot[]
): void {
    const slot = slots[slotIndex];

    console.log(`\n${title} slot ${slotIndex}`);

    for (const module of slot.modules) {
        const backHealth = slot.moduleHealth[Direction.Back][module.id];
        const forwardHealth = slot.moduleHealth[Direction.Forward][module.id];

        console.log(
            `  ${module.tag}: back=${backHealth}, forward=${forwardHealth}`
        );
    }
}
