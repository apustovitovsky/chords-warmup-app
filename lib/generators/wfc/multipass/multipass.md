# Multipass WFC Draft

## Goal

Multipass WFC builds music in layers. Each pass receives the collapsed result of the previous pass, compiles a flat `RuntimeGraph`, solves it, then decodes the result into a new `CollapsedPass`.

Runtime stays flat. It does not know about sections, chords, parent segments, resolution, or overlap.

```text
CollapsedPass
    + PatternPass
    + PatternPassOptions
        -> PatternPassCompiler
        -> RuntimeGraph
        -> CollapseSolver
        -> PatternPassDecoder
        -> CollapsedPass
```

## Data Model

`PatternPass` describes reusable pattern language.

```ts
interface PatternPass<TValue = string> {
    name: string;
    patterns: PatternDefinition<TValue>[];
}

interface PatternDefinition<TValue = string> {
    parentValues: TValue[];
    values: TValue[];
}
```

`PatternPassOptions` describes how to use a pass in a particular generation.

```ts
interface PatternPassOptions {
    resolution: number;
    overlap: number;
}
```

`CollapsedPass` is the factual output of a solved pass.

```ts
interface CollapsedPass<TValue = string> {
    segments: CollapsedSegment<TValue>[];
}

interface CollapsedSegment<TValue = string> {
    value: TValue;
    startIndex: number;
    endIndex: number;
}
```

## Initial Parent

There is no special root compiler mode. The initial input is also a collapsed pass.

```ts
const root: CollapsedPass = {
    segments: [
        { value: "root", startIndex: 0, endIndex: 16 },
    ],
};
```

The first real pass uses `root` as its parent.

## Example Passes

Form pass:

```ts
const formPass: PatternPass = {
    name: "form",
    patterns: [
        {
            parentValues: ["root"],
            values: ["intro", "verse", "outro"],
        },
        {
            parentValues: ["root"],
            values: ["intro", "chorus", "outro"],
        },
    ],
};

const formOptions: PatternPassOptions = {
    resolution: 1,
    overlap: 0,
};
```

Chord pass:

```ts
const chordPass: PatternPass = {
    name: "chords",
    patterns: [
        {
            parentValues: ["intro"],
            values: ["C", "Am", "F"],
        },
        {
            parentValues: ["verse"],
            values: ["C", "G", "Am", "F"],
        },
        {
            parentValues: ["outro"],
            values: ["F", "Fm"],
        },
    ],
};

const chordOptions: PatternPassOptions = {
    resolution: 4,
    overlap: 1,
};
```

## Resolution

`resolution` means child runtime nodes per one parent unit.

```text
parent segment:
verse [2, 6)

resolution = 4

child-space segment:
verse [8, 24)
```

Patterns are not resized or partially cut. Pattern values provide possible values and transition language for matching parent values.

## Overlap

`overlap` is a compiler option, not part of `PatternPass`.

It creates a temporary expanded view of parent segments in child space. This expanded view affects child domains only; it does not mutate the parent `CollapsedPass`.

Example parent result:

```ts
const form: CollapsedPass = {
    segments: [
        { value: "intro", startIndex: 0, endIndex: 2 },
        { value: "verse", startIndex: 2, endIndex: 6 },
        { value: "outro", startIndex: 6, endIndex: 8 },
    ],
};
```

Project to child space:

```text
resolution = 4

intro [0, 8)
verse [8, 24)
outro [24, 32)
```

Expand by overlap:

```text
overlap = 1

intro [0, 9)
verse [7, 25)
outro [23, 32)
```

Each runtime slot gets the union of parent values from expanded segments covering that slot:

```text
slot 7  -> intro + verse
slot 8  -> intro + verse
slot 23 -> verse + outro
slot 24 -> verse + outro
```

Large overlap values naturally merge more neighboring segment domains. If overlap zones intersect, domains are unioned.

## Segment Projection Helper

The compiler can delegate projection and overlap to a small helper.

```ts
interface ProjectedSegment<TValue = string> {
    value: TValue;
    startIndex: number;
    endIndex: number;
    sourceSegmentIndex: number;
}

class SegmentProjection<TValue = string> {
    project(
        parent: CollapsedPass<TValue>,
        options: PatternPassOptions
    ): ProjectedSegment<TValue>[];
}
```

The helper belongs to the compile layer. The decoder does not use it and does not know about overlap.

## Decode Layer

After a `RuntimeGraph` is solved, `PatternPassDecoder` converts resolved runtime nodes back into a clean `CollapsedPass`.

The decoder only reads final node values and groups adjacent equal values.

```text
resolved runtime values:
intro intro verse verse verse outro

decoded collapsed pass:
intro [0, 2)
verse [2, 5)
outro [5, 6)
```

Decoder class:

```ts
class PatternPassDecoder<TValue = string> {
    constructor(
        private readonly getValueKey: (value: TValue) => string = String
    ) {}

    decode(compiled: CompiledPatternPass<TValue>): CollapsedPass<TValue>;
}
```

Overlap is applied only while compiling the next pass:

```text
pass A RuntimeGraph
    -> PatternPassDecoder
    -> clean CollapsedPass

pass B compiler
    -> project parent segments
    -> expand projected segments by overlap
    -> build child domains
```

## Pass Cycle

```ts
let parent = root;

for (const step of pipeline) {
    const compiled = compiler.compile(
        step.pass,
        parent,
        step.options
    );

    new CollapseSolver(compiled.runtimeGraph).solve();

    parent = decoder.decode(compiled);
}
```

