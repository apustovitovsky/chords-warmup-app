"use client";

import { useState } from "react";

import { defaultWarmupRequest } from "@/features/warmup/model/defaultRequest";
import { ChordCard } from "@/features/warmup/ui/ChordCard";
import { SettingsPanel } from "@/features/warmup/ui/SettingsPanel";
import type {
    GeneratedProgression,
    GenerateProgressionRequest,
} from "@/lib/generator/progression/types";

type WarmupWorkspaceProps = {
    progression: GeneratedProgression;
};

export function WarmupWorkspace({ progression }: WarmupWorkspaceProps) {
    const [result, setResult] = useState(progression);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleGenerate(request: GenerateProgressionRequest) {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/progression", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error("Unable to generate this progression.");
            }

            const nextResult = (await response.json()) as GeneratedProgression;
            setResult(nextResult);
        } catch {
            setErrorMessage("Generation failed. Check the settings and try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:gap-6">
            <aside className="lg:sticky lg:top-8 lg:self-start">
                <SettingsPanel
                    initialRequest={defaultWarmupRequest}
                    isLoading={isLoading}
                    onGenerate={handleGenerate}
                />
            </aside>

            <section className="min-w-0 space-y-4">
                <header className="space-y-3">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                            Chords Warmup
                        </h1>

                        <p className="text-sm text-muted-foreground md:text-base">
                            Generate deterministic chord progressions by seed.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full border bg-card px-3 py-1 text-card-foreground">
                            {result.settings.key} major
                        </span>

                        <span className="rounded-full border bg-card px-3 py-1 font-mono text-card-foreground">
                            seed: {result.seed}
                        </span>

                        <span className="rounded-full border bg-card px-3 py-1 text-card-foreground">
                            {result.settings.lengthBars} bars
                        </span>
                    </div>
                </header>
                
                {errorMessage && (
                    <p
                        role="alert"
                        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    >
                        {errorMessage}
                    </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {result.bars.map((bar) => (
                        <ChordCard key={bar.index} bar={bar} />
                    ))}
                </div>
            </section>
        </div>
    );
}
