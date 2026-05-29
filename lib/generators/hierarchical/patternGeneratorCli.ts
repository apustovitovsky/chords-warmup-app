import PatternGenerator from "./patternGenerator.ts";
import MockPatternCollection from "./model/mockPatternCollection.ts";
import type {
    DeadEndDebugEvent,
} from "./patternGenerator.ts";

function formatCandidate(
    candidate: DeadEndDebugEvent["output"][number]
): string {
    return `[${candidate.patternId} #${candidate.segmentIndex} ${candidate.segment.role}] | ${candidate.segment.chords.join(" ")} |`;
}

function printDeadEnd(event: DeadEndDebugEvent): void {
    console.log(
        [
            `[dead end #${event.backtrackCount}] currentSize=${event.currentSize}, minSize=${event.minSize}`,
            "Output:",
            ...event.output.map((candidate) => `  ${formatCandidate(candidate)}`),
        ].join("\n")
    );
}

const minSizeArg = Number(process.argv[2]);
const minSize = Number.isFinite(minSizeArg) ? minSizeArg : 16;

const generator = new PatternGenerator({
    collection: MockPatternCollection,
    onDeadEnd: printDeadEnd,
});

const result = generator.generate({
    minSize,
    maxLookback: 2,
});

console.log("Backtracks:", result.backtracks);

if (!result.ok) {
    console.log(`Generation failed: ${result.reason}`);
} else {
    console.log(
        result.segments
            .map(
                (segment, index) =>
                    `${index}. (${segment.role}) ${segment.chords.join(" ")}, ${segment.patternId}:${segment.segmentIndex}`
            )
            .join("\n")
    );
}