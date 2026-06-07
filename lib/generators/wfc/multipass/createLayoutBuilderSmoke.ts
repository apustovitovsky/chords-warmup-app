import { LayoutBuilder, type Layout, type LayoutBuilderOptions } from "./layoutBuilder";

const values = ["intro", "verse", "chorus", "chorus", "verse", "outro"];
const cases: LayoutBuilderOptions[] = [
    { resolution: 1, overlap: 0 },
    { resolution: 2, overlap: 0 },
    { resolution: 2, overlap: 1 },
    { resolution: 4, overlap: 1 },
];

console.log("\nlayout builder smoke");
console.log(`\ninput: ${formatValues(values)}`);

for (const options of cases) {
    const layout = new LayoutBuilder(values).build(options);

    console.log(
        `\nresolution=${options.resolution}, overlap=${options.overlap}`
    );
    printLayout(layout);
}

function printLayout(layout: Layout<string>): void {
    for (let slotIndex = 0; slotIndex < layout.items.length; slotIndex++) {
        console.log(
            `  ${dim(`${slotIndex}.`)} ${formatValues(layout.items[slotIndex])}`
        );
    }
}

function formatValues(valuesToFormat: string[]): string {
    return valuesToFormat.map(gold).join(", ") || red("-");
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
