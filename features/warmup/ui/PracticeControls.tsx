"use client";

import { PauseIcon, PlayIcon, SquareIcon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";

import {
    startPracticeAudio,
    stopPracticeAudio,
} from "@/features/warmup/audio/practicePiano";

import { Button } from "@/components/ui/button";
import {
    pause,
    play,
    selectPlaybackStatus,
    selectTempoBpm,
    setTempoBpm,
    stop,
} from "@/features/warmup/model/practiceFocus";

import { Slider } from "@/components/ui/slider";


export function PracticeControls() {
    const dispatch = useDispatch();
    const playbackStatus = useSelector(selectPlaybackStatus);
    const tempoBpm = useSelector(selectTempoBpm);
    const [draftTempoBpm, setDraftTempoBpm] = useState(tempoBpm);

    useEffect(() => {
        setDraftTempoBpm(tempoBpm);
    }, [tempoBpm]);

    const isPlaying = playbackStatus === "playing";

    async function handlePlayPause() {
        if (isPlaying) {
            stopPracticeAudio();
            dispatch(pause());
            return;
        }

        await startPracticeAudio();
        dispatch(play());
    }

    function handleStop() {
        stopPracticeAudio();
        dispatch(stop());
    }

    return (
        <div className="mx-auto w-full max-w-xs space-y-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-center gap-3">
                <Button
                    type="button"
                    size="icon-lg"
                    className="size-12 rounded-full"
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? "Pause practice" : "Play practice"}
                >
                    {isPlaying ? (
                        <PauseIcon className="size-5" fill="currentColor" strokeWidth={0} />
                    ) : (
                        <PlayIcon className="size-5 translate-x-px" fill="currentColor" strokeWidth={0} />
                    )}
                </Button>

                <Button
                    type="button"
                    size="icon-lg"
                    variant="ghost"
                    className="size-12 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-accent"
                    onClick={handleStop}
                    aria-label="Stop practice"
                    disabled={playbackStatus === "stopped"}
                >
                    <SquareIcon className="size-4" fill="currentColor" strokeWidth={0} />
                </Button>
            </div>

            <div className="space-y-2 px-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Tempo</span>
                    <span className="font-mono">{draftTempoBpm} BPM</span>
                </div>

                <Slider
                    value={[draftTempoBpm]}
                    min={40}
                    max={160}
                    step={1}
                    onValueChange={(value) => setDraftTempoBpm(value[0])}
                    onValueCommit={(value) => dispatch(setTempoBpm(value[0]))}
                    aria-label="Tempo"
                />
            </div>
        </div>
    );
}