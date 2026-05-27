"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePracticePlayback } from "@/features/warmup/model/usePracticePlayback";
import {
    advanceBar,
    selectPlaybackStatus,
    selectTempoBpm,
} from "@/features/warmup/model/practiceFocus";
import { playPracticeChord } from "@/features/warmup/audio/practicePiano";

import { PracticeControls } from "@/features/warmup/ui/PracticeControls";
import { cn } from "@/lib/utils";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import { FocusChordCircle } from "@/features/warmup/ui/FocusChordCircle";
import type { BarDto } from "@/lib/generators/progression/types";
import { getPracticeChordNotes } from "@/lib/entities/chordVoicing";

type ProgressionFocusProps = {
    bars: BarDto[];
    activeBarIndex: number;
    onActiveBarChange: (index: number) => void;
};

export function ProgressionFocus({
    bars,
    activeBarIndex,
    onActiveBarChange,
}: ProgressionFocusProps) {
    const [api, setApi] = useState<CarouselApi>();
    const dispatch = useDispatch();
    const playbackStatus = useSelector(selectPlaybackStatus);
    const tempoBpm = useSelector(selectTempoBpm);

    usePracticePlayback({
        isPlaying: playbackStatus === "playing",
        tempoBpm,
        beatsPerBar: 4,
        onAdvanceBar: () => dispatch(advanceBar(bars.length)),
    });

    useEffect(() => {
        if (!api) {
            return;
        }

        const carouselApi = api;

        function handleSelect() {
            onActiveBarChange(carouselApi.selectedScrollSnap());
        }

        carouselApi.on("select", handleSelect);

        return () => {
            carouselApi.off("select", handleSelect);
        };
    }, [api, onActiveBarChange]);

    useEffect(() => {
        if (!api || api.selectedScrollSnap() === activeBarIndex) {
            return;
        }

        api.scrollTo(activeBarIndex);
    }, [api, activeBarIndex]);

    const activeChordSymbol = bars[activeBarIndex]?.chords[0]?.symbol;
    const activeChordNotes = activeChordSymbol
        ? getPracticeChordNotes(activeChordSymbol)
        : [];

    useEffect(() => {
        if (playbackStatus !== "playing" || activeChordNotes.length === 0) {
            return;
        }

        void playPracticeChord(activeChordNotes);
    }, [playbackStatus, activeBarIndex]);

    return (
        <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Practice focus
            </p>

            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                setApi={setApi}
                className="mx-auto w-full max-w-2xl"
            >
                <CarouselContent>
                    {bars.map((bar, index) => (
                        <CarouselItem key={bar.index} className="lg:basis-1/4 basis-1/2">
                            <div
                                className={cn(
                                    "transition-transform duration-200 ease-in px-2",
                                    index === activeBarIndex
                                        ? "scale-90"
                                        : "scale-90 opacity-90"
                                )}
                            >
                                <FocusChordCircle
                                    bar={bar}
                                    isActive={index === activeBarIndex}
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            <PracticeControls />
        </div>
    );
}