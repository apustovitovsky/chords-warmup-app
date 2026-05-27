import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BarDto } from "@/lib/generators/progression/types";
import { cn } from "@/lib/utils";

type ChordCardProps = {
    bar: BarDto;
    isActive?: boolean;
};

export function ChordCard({ bar, isActive = false }: ChordCardProps) {
    return (
        <Card
            className={cn(
                "transition-colors",
                isActive && "ring-2 ring-card-focus bg-accent"
            )}
        >
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                    Bar {bar.index}
                </CardTitle>
            </CardHeader>

            <CardContent>
                {bar.chords.map((chord, index) => (
                    <div key={index} className="space-y-1">
                        <div className="text-2xl font-semibold">{chord.symbol}</div>
                        <div className="text-sm text-muted-foreground">{chord.roman}</div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}