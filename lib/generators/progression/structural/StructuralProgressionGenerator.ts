import type { RomanChord, StructuralTemplate } from "./types";
import { SeededRandom } from "@/lib/random/seededRandom";

type ContextKey = string;
type WeightedCandidates = Map<RomanChord, number>;
type TransitionModel = Map<ContextKey, WeightedCandidates>;

export class StructuralProgressionGenerator {
    private readonly transitionModel: TransitionModel;
    private readonly startCandidates: WeightedCandidates;

    constructor(
        templates: readonly StructuralTemplate[],
        private readonly maxContextSize: number
    ) {
        this.transitionModel = this.buildTransitionModel(templates);
        this.startCandidates = this.buildStartCandidates(templates);
    }

    generate(
        targetLength: number,
        random: SeededRandom,
        startChord?: RomanChord
    ): RomanChord[] {
        if (targetLength <= 0) {
            return [];
        }

        const progression: RomanChord[] = [
            startChord ?? this.weightedPick(this.startCandidates, random),
        ];

        while (progression.length < targetLength) {
            const candidates = this.findCandidates(progression);

            const nextChord = candidates
                ? this.weightedPick(candidates, random)
                : this.weightedPick(this.startCandidates, random);

            progression.push(nextChord);
        }

        return progression;
    }

    private buildStartCandidates(
        templates: readonly StructuralTemplate[]
    ): WeightedCandidates {
        const candidates: WeightedCandidates = new Map();

        for (const template of templates) {
            const startChord = template[0];

            if (!startChord) {
                continue;
            }

            const currentWeight = candidates.get(startChord) ?? 0;
            candidates.set(startChord, currentWeight + 1);
        }

        if (candidates.size === 0) {
            throw new Error("Structural templates must contain at least one chord.");
        }

        return candidates;
    }

    private buildTransitionModel(
        templates: readonly StructuralTemplate[]
    ): TransitionModel {
        const model: TransitionModel = new Map();

        for (const template of templates) {
            for (let position = 0; position < template.length - 1; position++) {
                const nextChord = template[position + 1];

                for (
                    let contextSize = 1;
                    contextSize <= this.maxContextSize;
                    contextSize++
                ) {
                    const contextStart = position - contextSize + 1;

                    if (contextStart < 0) {
                        continue;
                    }

                    const context = template.slice(contextStart, position + 1);
                    this.addTransition(model, context, nextChord);
                }
            }
        }

        return model;
    }

    private addTransition(
        model: TransitionModel,
        context: readonly RomanChord[],
        nextChord: RomanChord
    ): void {
        const key = this.serializeContext(context);
        const candidates = model.get(key) ?? new Map<RomanChord, number>();
        const currentWeight = candidates.get(nextChord) ?? 0;

        candidates.set(nextChord, currentWeight + 1);
        model.set(key, candidates);
    }

    private findCandidates(
        progression: readonly RomanChord[]
    ): WeightedCandidates | undefined {
        const availableContextSize = Math.min(
            this.maxContextSize,
            progression.length
        );

        for (
            let contextSize = availableContextSize;
            contextSize >= 1;
            contextSize--
        ) {
            const context = progression.slice(-contextSize);
            const candidates = this.transitionModel.get(
                this.serializeContext(context)
            );

            if (candidates) {
                return candidates;
            }
        }

        return undefined;
    }

    private weightedPick(
        candidates: WeightedCandidates,
        random: SeededRandom
    ): RomanChord {
        let totalWeight = 0;

        for (const weight of candidates.values()) {
            totalWeight += weight;
        }

        let roll = random.nextFloat() * totalWeight;

        for (const [chord, weight] of candidates.entries()) {
            roll -= weight;

            if (roll <= 0) {
                return chord;
            }
        }

        return Array.from(candidates.keys())[candidates.size - 1];
    }

    private serializeContext(context: readonly RomanChord[]): ContextKey {
        return context.join(">");
    }
}