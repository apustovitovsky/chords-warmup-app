"use client";

import { useEffect, useState } from "react";


import { cn } from "@/lib/utils";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import { FocusChordCard } from "@/features/warmup/ui/FocusChordCard";
import type { BarDto } from "@/lib/generator/progression/types";

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

    useEffect(() => {
        if (!api) {
            return;
        }

        const carouselApi = api;

        function handleSelect() {
            onActiveBarChange(carouselApi.selectedScrollSnap());
        }

        handleSelect();
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

    const getCardOpacity = (index: number): number => {
        const directDistance = Math.abs(index - activeBarIndex);
        const loopDistance = bars.length - directDistance;
        const distance = Math.min(directDistance, loopDistance);

        return Math.max(1 - distance * 0.2, 0.4);
    }

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
                className="mx-auto w-full max-w-2xl px-10"
            >
                <CarouselContent>
                    {bars.map((bar, index) => (
                        <CarouselItem key={bar.index} className="lg:basis-1/4 basis-1/2">
                            <div
                                className={cn(
                                    "transition-all duration-400 ease-in-out",
                                    index === activeBarIndex
                                        ? "scale-100"
                                        : "scale-90"
                                )}
                                style={{ opacity: getCardOpacity(index) }}
                            >
                                <FocusChordCard
                                    bar={bar}
                                    isActive={index === activeBarIndex}
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>
    );
}