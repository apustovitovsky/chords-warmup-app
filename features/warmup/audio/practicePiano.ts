import {
    Reverb,
    SplendidGrandPiano,
    type SplendidGrandPiano as Piano,
} from "smplr";

let audioContext: AudioContext | null = null;
let piano: Piano | null = null;

async function getPiano(): Promise<Piano> {
    if (!audioContext) {
        audioContext = new AudioContext();
    }

    if (!piano) {
        piano = SplendidGrandPiano(audioContext, {
            volume: 90,
        });

        const reverb = Reverb(audioContext);
        piano.output.addEffect("reverb", reverb, 0.25);

        await piano.ready;
    }

    return piano;
}

export async function startPracticeAudio(): Promise<void> {
    if (!audioContext) {
        audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    const instrument = await getPiano();
    instrument.stop();
}

export async function playPracticeChord(notes: string[]): Promise<void> {
    const instrument = await getPiano();

    instrument.stop();

    notes.forEach((note) => {
        instrument.start({
            note,
            velocity: 85,
            duration: 1.5,
        });
    });
}

export function stopPracticeAudio(): void {
    piano?.stop();
}