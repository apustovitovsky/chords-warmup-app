import type { BarDto } from "@/lib/generator/progression/types";
import { cn } from "@/lib/utils";

type FocusChordCircleProps = {
    bar: BarDto;
    isActive?: boolean;
};

export function FocusChordCircle({
    bar,
    isActive = false,
}: FocusChordCircleProps) {
    return (
        <div
            className={cn(
                "flex aspect-square w-full items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors duration-200 ease-in",
                isActive && "bg-primary text-primary-foreground"
            )}
        >
            {bar.chords.map((chord, index) => (
                <div key={index} className="text-center">
                    <div className="text-3xl font-semibold">
                        {chord.symbol}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {chord.roman}
                    </div>
                </div>
            ))}
        </div>
    );
}