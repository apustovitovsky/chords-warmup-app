import { Chord } from "tonal";



export function getPracticeChordNotes(symbol: string): string[] {
    const chord = Chord.get(symbol);

    if (chord.empty || !chord.tonic) {
        return [];
    }

    return Chord.notes(chord.type, `${chord.tonic}4`);
}