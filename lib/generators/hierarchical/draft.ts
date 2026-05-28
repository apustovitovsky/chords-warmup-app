import RingBuffer from "./ringBuffer.ts";

type Random = () => number;

interface Bar {
    chords: string[];
    patternId?: string;
    index: number;
    patternLength?: number;
}

interface Pattern {
    id: string;
    bars: Bar[];
}


interface GenerateOptions {
    outputSize: number;
    recentBufferSize: number;
    random?: Random;
}

const defaultOptions: GenerateOptions = {
    outputSize: 64,
    recentBufferSize: 4,
    random: Math.random,
};

function generateProgression(
    patterns: Pattern[],
    options: GenerateOptions
): Bar[] {
    const {
        outputSize,
        recentBufferSize,
        random = Math.random,
    } = options;

    const outputBuffer: Bar[] = [];
    const recentBars = new RingBuffer<Bar>(recentBufferSize);

    while (outputBuffer.length < outputSize) {
        const nextBar = selectNextBar(
            patterns,
            outputBuffer,
            recentBars,
            random,
            outputSize
        );
        const selectedBar = {
            ...nextBar,
            chords: [...nextBar.chords],
        };

        outputBuffer.push(selectedBar);
        recentBars.push(selectedBar);

        console.log(
            `[add ${outputBuffer.length}/${outputSize}] ` +
            `[${selectedBar.patternId ?? "unknown"} #${selectedBar.index}] | ` +
            `${selectedBar.chords.join(" ")} |`
        );
    }

    return outputBuffer;
}

function selectNextBar(
    patterns: Pattern[],
    outputBuffer: Bar[],
    recentBars: RingBuffer<Bar>,
    random: Random,
    outputSize: number
): Bar {
    if (outputBuffer.length === 0) {
        return selectStartBar(patterns, random);
    }

    const remainingBars = outputSize - outputBuffer.length;

    if (remainingBars === 1) {
        return selectEndingBar(patterns, recentBars, random);
    }

    return selectContinuationBar(patterns, recentBars, random);
}

function selectStartBar(patterns: Pattern[], random: Random): Bar {
    const candidates = patterns
        .filter((pattern) => pattern.bars.length > 0)
        .map((pattern) => ({
            ...pattern.bars[0],
            patternId: pattern.id,
            patternLength: pattern.bars.length,
        }));

    if (candidates.length === 0) {
        throw new Error("No start bars found.");
    }

    return randomPick(candidates, random);
}

function selectContinuationBar(
    patterns: Pattern[],
    recentBars: RingBuffer<Bar>,
    random: Random
): Bar {
    const candidates = findByBackoff(patterns, recentBars.lastOrNull());

    if (candidates.length === 0) {
        throw new Error("No continuation candidates found.");
    }

    const filteredCandidates = filterCandidates(candidates, recentBars);

    if (filteredCandidates.length === 0) {
        throw new Error("All continuation candidates were filtered out.");
    }

    return randomPick(filteredCandidates, random);
}

function selectEndingBar(
    patterns: Pattern[],
    recentBars: RingBuffer<Bar>,
    random: Random
): Bar {
    const lastBar = recentBars.lastOrNull();

    if (!lastBar) {
        return selectStartBar(patterns, random);
    }

    const endingCandidates = findByBackoff(patterns, lastBar).filter(isEndingBar);

    if (endingCandidates.length === 0) {
        throw new Error("No ending candidates found.");
    }

    const filteredEndingCandidates = filterCandidates(endingCandidates, recentBars);

    if (filteredEndingCandidates.length === 0) {
        throw new Error("All ending candidates were filtered out.");
    }

    return randomPick(filteredEndingCandidates, random);
}

function findByBackoff(
    patterns: Pattern[],
    lastBar: Bar | null
): Bar[] {
    if (!lastBar) {
        return [];
    }

    for (let contextSize = lastBar.chords.length; contextSize >= 1; contextSize--) {
        const context = lastBar.chords.slice(lastBar.chords.length - contextSize);
        const candidates = findCandidates(patterns, context);

        if (candidates.length > 0) {
            return candidates;
        }
    }

    return [];
}

function filterCandidates(candidates: Bar[], recentBars: RingBuffer<Bar>): Bar[] {
    const recent = recentBars.toArray();
    const lastBar = recent[recent.length - 1];

    if (!lastBar) {
        return candidates;
    }

    const withoutImmediateRepeat = candidates.filter(
        (bar) =>
            bar.patternId !== lastBar.patternId ||
            bar.index !== lastBar.index
    );

    if (recent.length < recentBars.maxSize) {
        return withoutImmediateRepeat;
    }

    const lastPatternId = lastBar.patternId;

    if (!lastPatternId) {
        return withoutImmediateRepeat;
    }

    const stuckInSamePattern = recent.every(
        (bar) => bar.patternId === lastPatternId
    );

    if (!stuckInSamePattern) {
        return withoutImmediateRepeat;
    }

    return withoutImmediateRepeat.filter(
        (bar) => bar.patternId !== lastPatternId
    );
}

function findCandidates(patterns: Pattern[], context: string[]): Bar[] {
    const candidates: Bar[] = [];

    for (const pattern of patterns) {
        candidates.push(...findCandidatesInPattern(pattern, context));
    }

    return candidates;
}

function findCandidatesInPattern(
    pattern: Pattern,
    context: string[]
): Bar[] {
    const candidates: Bar[] = [];

    for (let barIndex = 1; barIndex < pattern.bars.length; barIndex++) {
        const previousBars = pattern.bars.slice(0, barIndex);
        const previousChords = previousBars.flatMap((bar) => bar.chords);

        if (endsWith(previousChords, context)) {
            candidates.push({
                ...pattern.bars[barIndex],
                patternId: pattern.id,
                patternLength: pattern.bars.length,
            });
        }
    }

    return candidates;
}

function isEndingBar(bar: Bar): boolean {
    return bar.patternLength !== undefined &&
        bar.index === bar.patternLength - 1;
}

function endsWith<T>(array: T[], suffix: T[]): boolean {
    if (suffix.length > array.length) {
        return false;
    }

    const offset = array.length - suffix.length;

    for (let i = 0; i < suffix.length; i++) {
        if (array[offset + i] !== suffix[i]) {
            return false;
        }
    }

    return true;
}

function randomPick<T>(items: T[], random: Random): T {
    const index = Math.floor(random() * items.length);
    return items[index];
}

const patterns: Pattern[] = [
    {
        id: "axis-pop",
        bars: [
            { index: 0, chords: ["I", "I", "V", "V"] },
            { index: 1, chords: ["vi", "vi", "IV", "IV"] },
            { index: 2, chords: ["I", "I", "V", "V"] },
            { index: 3, chords: ["vi", "vi", "IV", "IV"] },
        ],
    },
    {
        id: "doo-wop-ballad",
        bars: [
            { index: 0, chords: ["I", "I", "vi", "vi"] },
            { index: 1, chords: ["IV", "IV", "V", "V"] },
            { index: 2, chords: ["I", "I", "vi", "vi"] },
            { index: 3, chords: ["IV", "V", "I", "I"] },
        ],
    },
    {
        id: "pachelbel-canon",
        bars: [
            { index: 0, chords: ["I", "V", "vi", "iii"] },
            { index: 1, chords: ["IV", "I", "IV", "V"] },
            { index: 2, chords: ["I", "V", "vi", "iii"] },
            { index: 3, chords: ["IV", "I", "IV", "V"] },
        ],
    },
    {
        id: "royal-road-jpop",
        bars: [
            { index: 0, chords: ["IV", "V", "iii", "vi"] },
            { index: 1, chords: ["ii", "V", "I", "I"] },
            { index: 2, chords: ["IV", "V", "iii", "vi"] },
            { index: 3, chords: ["ii", "V", "I", "I"] },
        ],
    },
    {
        id: "jazz-standards-turnaround",
        bars: [
            { index: 0, chords: ["I", "vi", "ii", "V"] },
            { index: 1, chords: ["iii", "VI", "ii", "V"] },
            { index: 2, chords: ["I", "vi", "ii", "V"] },
            { index: 3, chords: ["I", "VI", "ii", "V"] },
        ],
    },
];

const result = generateProgression(patterns, defaultOptions);

console.log(
    result
        .map(
            (bar) =>
                `[${bar.patternId ?? "unknown"} #${bar.index}] | ${bar.chords.join(" ")} |`
        )
        .join("\n")
);


