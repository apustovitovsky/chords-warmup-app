import assert from "node:assert/strict";
import { describe, test } from "node:test";

import PatternGenerator from "../hierarchical/patternGenerator.ts";
import MockPatternCollection from "../hierarchical/model/mockPatternCollection.ts";
import type {
    GeneratedSegment,
    PatternCollectionDefinition,
} from "../hierarchical/model/patternCollectionDefinition.ts";

function sameChords(left: string[], right: string[]): boolean {
    return left.length === right.length &&
        left.every((chord, index) => chord === right[index]);
}

function hasJustifyingContext(
    generatedSegments: GeneratedSegment[],
    index: number,
    collection: PatternCollectionDefinition
): boolean {
    if (index === 0) {
        return generatedSegments[index].role === "intro";
    }

    const generatedSegment = generatedSegments[index];
    const pattern = collection.patterns.find(
        (item) => item.id === generatedSegment.patternId
    );

    if (!pattern) {
        return false;
    }

    const sourceSegment = pattern.segments[generatedSegment.segmentIndex];

    if (!sourceSegment) {
        return false;
    }

    if (
        sourceSegment.role !== generatedSegment.role ||
        !sameChords(sourceSegment.chords, generatedSegment.chords)
    ) {
        return false;
    }

    const generatedChordsBefore = generatedSegments
        .slice(0, index)
        .flatMap((segment) => segment.chords);

    const sourceChordsBefore = pattern.segments
        .slice(0, generatedSegment.segmentIndex)
        .flatMap((segment) => segment.chords);

    const maxContextSize = Math.min(
        4,
        generatedChordsBefore.length,
        sourceChordsBefore.length
    );

    for (let contextSize = maxContextSize; contextSize >= 1; contextSize--) {
        const generatedContext = generatedChordsBefore.slice(
            generatedChordsBefore.length - contextSize
        );
        const sourceContext = sourceChordsBefore.slice(
            sourceChordsBefore.length - contextSize
        );

        if (sameChords(generatedContext, sourceContext)) {
            return true;
        }
    }

    return false;
}

describe("PatternGenerator", () => {
    test("generates only source-justified segments", () => {
        const generator = new PatternGenerator({
            collection: MockPatternCollection,
            random: () => 0,
        });

        for (const minSize of [16, 26, 32, 40, 44]) {
            const result = generator.generate({
                minSize,
                maxLookback: 4,
            });

            assert.equal(result.ok, true);

            if (!result.ok) {
                return;
            }

            assert.equal(result.segments[0].role, "intro");
            assert.equal(result.segments.at(-1)?.role, "outro");

            for (let index = 0; index < result.segments.length; index++) {
                assert.equal(
                    hasJustifyingContext(
                        result.segments,
                        index,
                        MockPatternCollection
                    ),
                    true,
                    `segment ${index} is not justified for minSize=${minSize}`
                );
            }
        }
    });
});
