import * as Tone from 'tone';

const synth = new Tone.FMSynth().toDestination();

export type Note = string;

/**
 * Plays a single note.
 * @param {Note} note - The note to play (e.g., "C4", "F#5").
 */
export function playNote(note: Note): void {
    synth.triggerAttackRelease(note, '8n'); // '8n' means an eighth note duration
}

/**
 * Plays two notes one after another to form a melodic interval.
 * @param {Note} note1 - The starting note.
 *   @param {Note} note2 - The ending note.
 */
export function playMelodicInterval(note1: Note, note2: Note): void {
    const now = Tone.now();
    
    synth.triggerAttackRelease(note1, '8n', now);
    
    synth.triggerAttackRelease(note2, '8n', now + 0.5);
}