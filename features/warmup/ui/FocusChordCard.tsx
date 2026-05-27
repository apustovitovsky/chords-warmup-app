import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BarDto } from "@/lib/generators/progression/types";
import { cn } from "@/lib/utils";

type FocusChordCardProps = {
    bar: BarDto;
    isActive?: boolean;
};

export function FocusChordCard({
    bar,
    isActive = false,
}: FocusChordCardProps) {
    return (
        <Card
            className={cn(
                "transition-colors duration-200 ease-in",
                isActive && "bg-accent ring-accent"
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
                        <div className="text-3xl font-semibold">
                            {chord.symbol}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {chord.roman}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}