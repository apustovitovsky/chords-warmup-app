"use client";

import { useEffect, useState } from "react";


import { cn } from "@/lib/utils";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import { FocusChordCircle } from "@/features/warmup/ui/FocusChordCircle";
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
                                        ? "scale-100"
                                        : "scale-80"
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
        </div>
    );
}