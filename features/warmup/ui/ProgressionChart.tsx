import { ChordCard } from "@/features/warmup/ui/ChordCard";
import type { BarDto } from "@/lib/generator/progression/types";

type ProgressionChartProps = {
    bars: BarDto[];
    activeBarIndex: number;
    onBarSelect: (index: number) => void;
};

export function ProgressionChart({
    bars,
    activeBarIndex,
    onBarSelect,
}: ProgressionChartProps) {
    return (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {bars.map((bar, index) => (
                <button
                    key={bar.index}
                    type="button"
                    className="text-left"
                    onClick={() => onBarSelect(index)}
                    aria-label={`Select bar ${bar.index}`}
                >
                    <ChordCard
                        bar={bar}
                        isActive={index === activeBarIndex}
                    />
                </button>
            ))}
        </div>
    );
}