import { useEffect, useEffectEvent } from "react";

type UsePracticePlaybackParams = {
    isPlaying: boolean;
    tempoBpm: number;
    beatsPerBar: number;
    onAdvanceBar: () => void;
};

export function usePracticePlayback({
    isPlaying,
    tempoBpm,
    beatsPerBar,
    onAdvanceBar,
}: UsePracticePlaybackParams): void {
    const advanceBar = useEffectEvent(onAdvanceBar);
    const barDurationMs = (beatsPerBar * 60_000) / tempoBpm;

    useEffect(() => {
        if (!isPlaying) {
            return;
        }

        const intervalId = window.setInterval(() => {
            advanceBar();
        }, barDurationMs);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isPlaying, barDurationMs]);
}