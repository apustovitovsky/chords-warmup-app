"use client";

import { useState } from "react";
import type {
    GeneratedProgression,
    GenerateProgressionRequest,
} from "@/lib/music/generator/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const defaultRequest: GenerateProgressionRequest = {
    seed: "18429",
    generatorVersion: "v1",
    settings: {
        key: "C",
        mode: "major",
        style: "pop",
        difficulty: 1,
        lengthBars: 4,
        meter: "4/4",
        harmonicRhythm: "oneChordPerBar",
        allowPassingChords: false,
        allowBorrowedChords: false,
        allowSecondaryDominants: false,
    },
};

export default function WarmupPage() {
    const [result, setResult] = useState<GeneratedProgression | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleGenerate() {
        setIsLoading(true);

        try {
            const response = await fetch("/api/progression", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(defaultRequest),
            });

            if (!response.ok) {
                throw new Error("Failed to generate progression.");
            }

            const data = (await response.json()) as GeneratedProgression;
            setResult(data);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
            <header>
                <h1 className="text-3xl font-bold">Chords Warmup</h1>
                <p className="text-muted-foreground">
                    Deterministic chord progression generator by seed.
                </p>
            </header>

            <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? "Generating..." : "Generate"}
            </Button>

            {result && (
                <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {result.bars.map((bar) => (
                        <Card key={bar.index}>
                            <CardHeader>
                                <CardTitle className="text-sm text-muted-foreground">
                                    Bar {bar.index}
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {bar.chords.map((chord, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="text-2xl font-semibold">{chord.symbol}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {chord.roman}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </section>
            )}
        </main>
    );
}
