import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BarDto } from "@/lib/generator/progression/types";

type ChordCardProps = {
    bar: BarDto;
};

export function ChordCard({ bar }: ChordCardProps) {
    return (
        <Card>
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
