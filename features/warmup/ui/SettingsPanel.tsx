"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type {
    GenerateProgressionRequest,
} from "@/lib/generator/progression/types";

import {
    SUPPORTED_TONICS,
    type Tonic,
} from "@/lib/model/harmony/key";

type SettingsPanelProps = {
    initialRequest: GenerateProgressionRequest;
    isLoading: boolean;
    onGenerate: (request: GenerateProgressionRequest) => void;
};

export function SettingsPanel({
    initialRequest,
    isLoading,
    onGenerate,
}: SettingsPanelProps) {
    const [seed, setSeed] = useState(initialRequest.seed);
    const [key, setKey] = useState<Tonic>(initialRequest.settings.key);
    const [lengthBars, setLengthBars] = useState<4 | 8 | 16>(
        initialRequest.settings.lengthBars
    );

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        onGenerate({
            ...initialRequest,
            seed,
            settings: {
                ...initialRequest.settings,
                key,
                lengthBars,
            },
        });
    }

    return (
        <form
            className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
            onSubmit={handleSubmit}
        >
            <h2 className="font-semibold">Settings</h2>

            <div className="mt-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="seed">Seed</Label>
                    <Input
                        id="seed"
                        name="seed"
                        value={seed}
                        onChange={(event) => setSeed(event.target.value)}
                        className="font-mono"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="key">Key</Label>
                    <Select
                        value={key}
                        onValueChange={(value) => setKey(value as Tonic)}
                    >
                        <SelectTrigger id="key" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SUPPORTED_TONICS.map((tonic) => (
                                <SelectItem key={tonic} value={tonic}>
                                    {tonic}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bars">Bars</Label>
                    <Select
                        value={String(lengthBars)}
                        onValueChange={(value) =>
                            setLengthBars(Number(value) as 4 | 8 | 16)
                        }
                    >
                        <SelectTrigger id="bars" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="4">4 bars</SelectItem>
                            <SelectItem value="8">8 bars</SelectItem>
                            <SelectItem value="16">16 bars</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Generating..." : "Generate"}
                </Button>
            </div>
        </form>
    );
}
