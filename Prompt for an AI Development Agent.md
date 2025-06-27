Prompt for an AI Development Agent
Project Context:
"We are enhancing the lore of our Svelte+TS game, 'Aetheria'. We have decided that the melodic theme for the 'Great Harmony' will be the main phrase from Beethoven's 'Ode to Joy'. We need to implement a reusable function in our SoundEngine.ts to play this melody on command."
Step 1: Define a New Synthesizer for the Theme
Instruction:
"In src/lib/SoundEngine.ts, define a new, secondary synthesizer instance to be used exclusively for the Great Harmony theme.
Name the new constant harmonySynth.
Instantiate it as a new Tone.Synth().
Configure its oscillator to have a type of 'sine' to give it a pure, fundamental sound.
Configure its envelope for a softer sound: attack: 0.1, decay: 0.2, sustain: 0.5, release: 1.
Chain the .toDestination() method to route its audio output."
Step 2: Transcribe the "Ode to Joy" Melody
Instruction:
"Create a data structure that represents the notes and timing for the main theme of 'Ode to Joy'.
Define a constant named odeToJoyMelody.
It should be an array of objects.
Each object must contain three properties: time (string), note (string), and duration (string).
Use Tone.js transport time notation ('Bars:Quarters') for the time property.
Populate the array with the following 15 note events:
{ time: '0:0', note: 'E4', duration: '4n' }
{ time: '0:1', note: 'E4', duration: '4n' }
{ time: '0:2', note: 'F4', duration: '4n' }
{ time: '0:3', note: 'G4', duration: '4n' }
{ time: '1:0', note: 'G4', duration: '4n' }
{ time: '1:1', note: 'F4', duration: '4n' }
{ time: '1:2', note: 'E4', duration: '4n' }
{ time: '1:3', note: 'D4', duration: '4n' }
{ time: '2:0', note: 'C4', duration: '4n' }
{ time: '2:1', note: 'C4', duration: '4n' }
{ time: '2:2', note: 'D4', duration: '4n' }
{ time: '2:3', note: 'E4', duration: '4n' }
{ time: '3:0', note: 'E4', duration: '2n' }
{ time: '3:2', note: 'D4', duration: '2n' }"
Step 3: Create a Tone.Part to Schedule the Melody
Instruction:
"Use Tone.js's Tone.Part to schedule the playback of the odeToJoyMelody array.
Define a new constant named harmonyPart.
Instantiate it as a new Tone.Part().
The first argument for the Tone.Part constructor is a callback function: (time, value) => { harmonySynth.triggerAttackRelease(value.note, value.duration, time); }. This function tells Tone.js what to do for each note event.
The second argument is the odeToJoyMelody array we created in the previous step.
Set the loop property of harmonyPart to false."
Step 4: Export a Function to Play the Theme
Instruction:
"Create and export a new function that other parts of the application can call to play the Great Harmony theme.
Define a new exported function named playGreatHarmonyTheme(): void.
Inside this function, add a defensive check: if (Tone.context.state !== 'running') { Tone.context.resume(); }. This handles browser audio policies.
The main action of the function is to call Tone.Transport.start(). This will start the master clock and trigger the harmonyPart to play."