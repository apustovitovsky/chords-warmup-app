import { LayoutBuilder, type Layout, type LayoutBuilderOptions } from "../multipass/layoutBuilder";

const domains = ["intro", "verse", "chorus", "outro"];
const domainIds = [0, 1, 2, 2, 1, 3];
const cases: LayoutBuilderOptions[] = [
    { resolution: 1, overlap: 0 },
    { resolution: 2, overlap: 0 },
    { resolution: 2, overlap: 1 },
    { resolution: 4, overlap: 1 },
];

console.log("\nlayout builder smoke");
console.log(`\ninput: ${formatDomainIds(domainIds)}`);

for (const options of cases) {
    const layout = new LayoutBuilder(domainIds).build(options);

    console.log(
        `\nresolution=${options.resolution}, overlap=${options.overlap}`
    );
    printLayout(layout);
}

function printLayout(layout: Layout): void {
    for (let slotIndex = 0; slotIndex < layout.items.length; slotIndex++) {
        console.log(
            `  ${dim(`${slotIndex}.`)} ${formatDomainIds(layout.items[slotIndex])}`
        );
    }
}

function formatDomainIds(domainIdsToFormat: number[]): string {
    return domainIdsToFormat
        .map((domainId) => `${gold(domains[domainId])}${dim(`:${domainId}`)}`)
        .join(", ") || red("-");
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
