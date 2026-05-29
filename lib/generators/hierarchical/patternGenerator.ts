import type {
    GenerationResult,
    GeneratedSegment,
    SegmentRole,
    SegmentCandidate,
    PatternCollectionDefinition,
} from "./model/patternCollectionDefinition.ts";

type Random = () => number;

interface PatternGeneratorOptions {
    collection: PatternCollectionDefinition;
    random?: Random;
    onDeadEnd?: (event: DeadEndDebugEvent) => void;
}

export interface DeadEndDebugEvent {
    backtrackCount: number;
    minSize: number;
    currentSize: number;
    output: SegmentCandidate[];
}

export default class PatternGenerator {
    private readonly patternCollection: PatternCollectionDefinition;
    private readonly random: Random;
    private backtrackCount = 0;
    private readonly onDeadEnd?: (event: DeadEndDebugEvent) => void;

    constructor({
        collection,
        random = Math.random,
        onDeadEnd,
    }: PatternGeneratorOptions) {
        this.patternCollection = collection;
        this.random = random;
        this.onDeadEnd = onDeadEnd;
    }

    generate(request: {
        minSize: number;
        maxLookback: number;
    }): GenerationResult {
        this.backtrackCount = 0;

        const result = this.tryBuild({
            minSize: request.minSize,
            maxLookback: request.maxLookback,
            currentSize: 0,
            output: [],
        });

        if (!result) {
            return {
                ok: false,
                backtracks: this.backtrackCount,
                reason: "no-valid-progression",
            };
        }

        return {
            ok: true,
            backtracks: this.backtrackCount,
            segments: result.map((candidate) => this.toGeneratedSegment(candidate)),
        };
    }

    private toGeneratedSegment(candidate: SegmentCandidate): GeneratedSegment {
        return {
            patternId: candidate.patternId,
            segmentIndex: candidate.segmentIndex,
            role: candidate.segment.role,
            chords: [...candidate.segment.chords],
        };
    }

    tryBuild(state: {
        minSize: number;
        maxLookback: number;
        currentSize: number;
        output: SegmentCandidate[];
    }): SegmentCandidate[] | null {

        const candidates = this.shuffle(this.getCandidatesForState(state));

        if (candidates.length === 0) {
            this.backtrackCount++;

            this.onDeadEnd?.({
                backtrackCount: this.backtrackCount,
                minSize: state.minSize,
                currentSize: state.currentSize,
                output: state.output,
            });

            return null;
        }

        for (const candidate of candidates) {
            const segmentSize = candidate.segment.chords.length;

            const nextOutput = [...state.output, candidate];
            const nextSize = state.currentSize + segmentSize;

            // Успех только если добавили outro и уже достигли minSize
            if (candidate.segment.role === "outro" && nextSize >= state.minSize) {
                return nextOutput;
            }

            // Если outro добавили слишком рано — ветка невалидна
            if (candidate.segment.role === "outro") {
                this.backtrackCount++;
                continue;
            }

            const result = this.tryBuild({
                minSize: state.minSize,
                maxLookback: state.maxLookback,
                currentSize: nextSize,
                output: nextOutput,
            });

            if (result !== null) {
                return result;
            }
        }

        return null;
    }

    private getSegmentKey(candidate: SegmentCandidate): string {
        return `${candidate.patternId}:${candidate.segmentIndex}`;
    }

    private getUsedSegmentKeys(output: SegmentCandidate[]): Set<string> {
        return new Set(
            output.map((candidate) => this.getSegmentKey(candidate))
        );
    }

    private removeUsedCandidates(
        candidates: SegmentCandidate[],
        usedSegmentKeys: Set<string>
    ): SegmentCandidate[] {
        return candidates.filter(
            (candidate) => !usedSegmentKeys.has(this.getSegmentKey(candidate))
        );
    }

    private getCandidatesForState(state: {
        minSize: number;
        maxLookback: number;
        currentSize: number;
        output: SegmentCandidate[];
    }): SegmentCandidate[] {
        let candidates: SegmentCandidate[];

        if (state.currentSize === 0) {
            candidates = this.getCandidatesByRole("intro");
        } else if (state.currentSize >= state.minSize) {
            candidates = this.getCandidatesByRole("outro");
        } else {
            candidates = this.removeUsedCandidates(
                this.getCandidatesByRole("verse"),
                this.getUsedSegmentKeys(state.output)
            );
        }

        return this.findByBackoff(
            candidates,
            state.output,
            state.maxLookback
        );
    }

    private findByBackoff(
        candidates: SegmentCandidate[],
        output: SegmentCandidate[],
        maxLookback: number
    ): SegmentCandidate[] {
        const outputChords = output.flatMap((candidate) => candidate.segment.chords);

        if (outputChords.length === 0) {
            return candidates;
        }

        for (
            let contextSize = Math.min(maxLookback, outputChords.length);
            contextSize >= 1;
            contextSize--
        ) {
            const context = outputChords.slice(outputChords.length - contextSize);

            const matchingCandidates = candidates.filter((candidate) =>
                this.candidateFollowsContext(candidate, context)
            );

            if (matchingCandidates.length > 0) {
                return matchingCandidates;
            }
        }

        return [];
    }

    private candidateFollowsContext(
        candidate: SegmentCandidate,
        context: string[]
    ): boolean {
        const pattern = this.patternCollection.patterns.find(
            (item) => item.id === candidate.patternId
        );

        if (!pattern) {
            return false;
        }

        if (candidate.segmentIndex <= 0) {
            return false;
        }

        const previousChords = pattern.segments
            .slice(0, candidate.segmentIndex)
            .flatMap((segment) => segment.chords);

        return this.endsWith(previousChords, context);
    }

    private endsWith<T>(array: T[], suffix: T[]): boolean {
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

    private shuffle<T>(items: T[]): T[] {
        const result = [...items];

        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }

        return result;
    }

    private getCandidates(): SegmentCandidate[] {
        return this.patternCollection.patterns.flatMap((pattern) =>
            pattern.segments.map((segment, segmentIndex) => ({
                patternId: pattern.id,
                segmentIndex,
                segment,
            }))
        );
    }

    private getCandidatesByRole(role: SegmentRole): SegmentCandidate[] {
        return this.getCandidates().filter(
            (candidate) => candidate.segment.role === role
        );
    }
}


