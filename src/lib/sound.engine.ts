import * as Tone from 'tone';

const synth = new Tone.FMSynth().toDestination();

const harmonySynth = new Tone.Synth({
    oscillator: {
        type: 'sine'
    },
    envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 1
    }
}).toDestination();

const odeToJoyMelody = [
    { time: '0:0', note: 'E4', duration: '4n' },
    { time: '0:1', note: 'E4', duration: '4n' },
    { time: '0:2', note: 'F4', duration: '4n' },
    { time: '0:3', note: 'G4', duration: '4n' },
    { time: '1:0', note: 'G4', duration: '4n' },
    { time: '1:1', note: 'F4', duration: '4n' },
    { time: '1:2', note: 'E4', duration: '4n' },
    { time: '1:3', note: 'D4', duration: '4n' },
    { time: '2:0', note: 'C4', duration: '4n' },
    { time: '2:1', note: 'C4', duration: '4n' },
    { time: '2:2', note: 'D4', duration: '4n' },
    { time: '2:3', note: 'E4', duration: '4n' },
    { time: '3:0', note: 'E4', duration: '2n' },
    { time: '3:2', note: 'D4', duration: '2n' }
];

const harmonyPart = new Tone.Part((time, value) => {
    harmonySynth.triggerAttackRelease(value.note, value.duration, time);
}, odeToJoyMelody);
harmonyPart.loop = false;

export function playGreatHarmonyTheme(): void {
    if (Tone.context.state !== 'running') {
        Tone.context.resume();
    }
    Tone.Transport.start();
}

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