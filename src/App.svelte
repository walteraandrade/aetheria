<script lang="ts">
    import { playMelodicInterval, type Note } from './lib/sound.engine';
    import * as Tone from 'tone';

    interface Spell {
        name: string;
        notes: [Note, Note];
        description: string;
    }

    type SpellName = 'Major Third' | 'Perfect Fifth' | 'Minor Third' | 'Tritone';

    type GameState = 'tutorial' | 'battle' | 'map';
    let gameState: GameState = 'tutorial';

    let playerHealth: number = 100;
    let enemyHealth: number = 100;
    let message: string = "A wild Shrieking Imp appears! Prepare for battle.";
    let choices: SpellName[] = [];
    let currentAnswer: SpellName | null = null;
    let isBattling: boolean = false;
    let turnInProgress: boolean = false;

    type TutorialPhase = 'intro' | 'learningPitch' | 'combat' | 'climax' | 'reward';
    let tutorialPhase: TutorialPhase = 'intro';
    let tutorialMessageIndex: number = 0;
    let tutorialCombatIndex: number = 0;
    let learningPitchStep: number = 0;

    const tutorialIntroMessages: string[] = [
        "The world of Aetheria has fallen silent...",
        "You are a Sound-Sorcerer...",
        "You find his tower, but a dissonant beast...",
        "From inside, a voice like a thunderous rock god screams...",
        "So, you want to learn the Harmonic Arts? ... DEFEAT IT!"
    ];

    const tutorialRewardMessages: string[] = [
        "Hmph. Not bad. You have a basic sense of pitch...",
        "You have learned: Major Third Strike!",
        "You have learned: Perfect Fifth Shield!",
        "Now the real training begins. Prepare for your first true battle."
    ];

    interface TutorialAttack {
        type: 'higher' | 'lower' | 'equal';
        notes: [Note, Note];
        correctAction: 'Bend' | 'Jump' | 'Brace';
    }

    const tutorialCombatSequence: TutorialAttack[] = [
        { type: 'higher', notes: ['C4', 'E4'], correctAction: 'Bend' },
        { type: 'lower', notes: ['G4', 'D4'], correctAction: 'Jump' },
        { type: 'equal', notes: ['F4', 'F4'], correctAction: 'Brace' },
        { type: 'higher', notes: ['D4', 'A4'], correctAction: 'Bend' }
    ];

    const spellbook: Record<SpellName, Spell> = {
        'Major Third': { name: 'Major Third', notes: ['C4', 'E4'], description: 'A bright, happy sound.' },
        'Perfect Fifth': { name: 'Perfect Fifth', notes: ['C4', 'G4'], description: 'A stable, heroic sound.' },
        'Minor Third': { name: 'Minor Third', notes: ['C4', 'Eb4'], description: 'A sad, thoughtful sound.' },
        'Tritone': { name: 'Tritone', notes: ['C4', 'F#4'], description: 'A dissonant, unstable sound.' }
    };

    async function startBattle(): Promise<void> {
        await Tone.start();
        console.log("Audio Context is ready.");

        isBattling = true;
        playerHealth = 100;
        enemyHealth = 100;
        message = "The battle begins!";
        
        const initialSpells: SpellName[] = ['Major Third', 'Perfect Fifth'];
        choices = initialSpells.sort(() => 0.5 - Math.random());

        enemyAttack();
    }

    function handleTutorialAction(action: 'Bend' | 'Jump' | 'Brace'): void {
        const currentAttack = tutorialCombatSequence[tutorialCombatIndex];
        if (!currentAttack) return;

        if (action === currentAttack.correctAction) {
            enemyHealth -= 34;
            message = `Correct! You chose ${action} and deal 34 damage!`;
        } else {
            playerHealth -= 25;
            message = `Wrong! It was a ${currentAttack.correctAction}. You take 25 damage!`;
        }

        tutorialCombatIndex++;

        if (enemyHealth <= 0) {
            message = "You have defeated the Dissonant Beast! Victory!";
            tutorialPhase = 'reward';
        } else if (playerHealth <= 0) {
            message = "You have been defeated... The world remains in dissonance.";
        } else if (tutorialCombatIndex >= tutorialCombatSequence.length) {
            tutorialPhase = 'reward';
        } else {
            setTimeout(() => {
                playNextTutorialAttack();
            }, 2000);
        }
    }

    function playNextTutorialAttack(): void {
        const currentAttack = tutorialCombatSequence[tutorialCombatIndex];
        if (currentAttack) {
            playMelodicInterval(currentAttack.notes[0], currentAttack.notes[1]);
            message = `The Dissonant Beast plays a ${currentAttack.type} interval.`;
        }
    }

    function enemyAttack(): void {
        if (turnInProgress) return;
        turnInProgress = true;

        message = "The Imp shrieks a dissonant sound...";
        
        const availableSpells = Object.keys(spellbook) as SpellName[];
        const randomSpellName = availableSpells[Math.floor(Math.random() * availableSpells.length)];
        currentAnswer = randomSpellName;
        
        const notesToPlay = spellbook[randomSpellName].notes;

        generateChoices(randomSpellName);
        playMelodicInterval(notesToPlay[0], notesToPlay[1]);
    }

    function generateChoices(correctAnswer: SpellName): void {
        let allSpells = Object.keys(spellbook) as SpellName[];
        let wrongAnswers = allSpells.filter(spell => spell !== correctAnswer);
        wrongAnswers.sort(() => 0.5 - Math.random());
        
        let finalChoices = [correctAnswer, wrongAnswers[0], wrongAnswers[1]];
        choices = finalChoices.sort(() => 0.5 - Math.random()) as SpellName[];
    }

    function advanceTutorial(): void {
        if (tutorialPhase === 'intro') {
            tutorialMessageIndex++;
            if (tutorialMessageIndex >= tutorialIntroMessages.length) {
                tutorialPhase = 'learningPitch';
                tutorialMessageIndex = 0;
            }
        } else if (tutorialPhase === 'reward') {
            tutorialMessageIndex++;
            if (tutorialMessageIndex >= tutorialRewardMessages.length) {
                gameState = 'battle';
                startBattle();
            }
        }
    }

    function handlePlayerChoice(choice: SpellName): void {
        if (!isBattling || !turnInProgress || currentAnswer === null) return;

        if (choice === currentAnswer) {
            enemyHealth -= 34;
            message = `Correct! You cast "${choice}" and deal 34 damage!`;
        } else {
            playerHealth -= 25;
            message = `Wrong! It was a ${currentAnswer}. You take 25 damage!`;
        }

        if (enemyHealth <= 0) {
            message = "You have defeated the Shrieking Imp! Victory!";
            isBattling = false;
        } else if (playerHealth <= 0) {
            message = "You have been defeated... The world remains in dissonance.";
            isBattling = false;
        } else {
            setTimeout(() => {
                turnInProgress = false;
                if (isBattling) enemyAttack();
            }, 2000);
        }
    }
</script>

<main>
    <h1>Aetheria: The Sound-Sorcerer's Quest</h1>

    {#if gameState === 'tutorial'}
        {#if tutorialPhase === 'intro'}
            <div class="message-log">{tutorialIntroMessages[tutorialMessageIndex]}</div>
            <button class="start-button" on:click={advanceTutorial}>
                Next
            </button>
        {:else if tutorialPhase === 'learningPitch'}
            {#if learningPitchStep === 0}
                <div class="message-log">
                    <p>Mentor: Listen closely. I will play a note, then a second one. If the second note is HIGHER, you must 'Bend' the sound.</p>
                </div>
                <button on:click={() => { playMelodicInterval('C4', 'E4'); }}>Play Higher Notes</button>
                <button on:click={() => { learningPitchStep = 1; }}>Bend</button>
            {:else if learningPitchStep === 1}
                <div class="message-log">
                    <p>Mentor: Good. Now, if the second note is LOWER, you must 'Jump' the sound.</p>
                </div>
                <button on:click={() => { playMelodicInterval('G4', 'D4'); }}>Play Lower Notes</button>
                <button on:click={() => { tutorialPhase = 'combat'; playNextTutorialAttack(); }}>Jump</button>
            {/if}
        {:else if tutorialPhase === 'combat' || tutorialPhase === 'climax'}
            <div class="battle-scene">
                <div class="character-pane">
                    <h2>Sound-Sorcerer</h2>
                    <div class="health-bar">
                        <div class="health-fill" style="width: {playerHealth}%;"></div>
                        <span>{playerHealth} / 100 HP</span>
                    </div>
                </div>
                <div class="character-pane">
                    <h2>Dissonant Beast</h2>
                    <div class="health-fill" style="width: {enemyHealth}%;"></div>
                    <span>{enemyHealth} / 100 HP</span>
                </div>
            </div>

            <div class="message-log">{message}</div>

            <div class="spellbook">
                <button on:click={() => handleTutorialAction('Bend')}>Bend</button>
                <button on:click={() => handleTutorialAction('Jump')}>Jump</button>
                {#if tutorialCombatSequence[tutorialCombatIndex] && tutorialCombatSequence[tutorialCombatIndex].correctAction === 'Brace'}
                    <button on:click={() => handleTutorialAction('Brace')}>Brace</button>
                {/if}
            </div>
        {:else if tutorialPhase === 'reward'}
            <div class="message-log">{tutorialRewardMessages[tutorialMessageIndex]}</div>
            <button class="start-button" on:click={advanceTutorial}>
                Next
            </button>
        {/if}
    {:else if gameState === 'battle'}
        {#if !isBattling}
            <div class="message-log">{message}</div>
            <button class="start-button" on:click={startBattle}>
                {playerHealth <= 0 ? 'Try Again' : 'Start Your Quest'}
            </button>
        {:else}
            <div class="battle-scene">
                <div class="character-pane">
                    <h2>Sound-Sorcerer</h2>
                    <div class="health-bar">
                        <div class="health-fill" style="width: {playerHealth}%;"></div>
                        <span>{playerHealth} / 100 HP</span>
                    </div>
                </div>
                <div class="character-pane">
                    <h2>Shrieking Imp</h2>
                    <div class="health-bar">
                        <div class="health-fill" style="width: {enemyHealth}%;"></div>
                        <span>{enemyHealth} / 100 HP</span>
                    </div>
                </div>
            </div>

            <div class="message-log">{message}</div>

            <div class="spellbook">
                {#each choices as choice}
                    <button on:click={() => handlePlayerChoice(choice)}>
                        Cast "{choice}"
                    </button>
                {/each}
            </div>
        {/if}
    {:else if gameState === 'map'}
        <h1>World Map</h1>
    {/if}
</main>

<style>
    :root {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        --border-color: #555;
        --player-health: #4caf50;
        --enemy-health: #f44336;
        --background-color: #222;
        --text-color: #eee;
    }

    main {
        text-align: center;
        padding: 2em;
        margin: 0 auto;
        max-width: 800px;
        background-color: var(--background-color);
        color: var(--text-color);
        min-height: 100vh;
    }

    .battle-scene {
        display: flex;
        justify-content: space-around;
        margin: 2em 0;
    }

    .character-pane {
        width: 40%;
    }

    .health-bar {
        background-color: #333;
        border-radius: 5px;
        border: 2px solid var(--border-color);
        position: relative;
        height: 30px;
        overflow: hidden;
    }
    
    .health-bar span {
        position: absolute;
        width: 100%;
        text-align: center;
        line-height: 30px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 2px black;
    }

    .health-fill {
        background-color: var(--player-health);
        height: 100%;
        transition: width 0.5s ease-in-out;
    }
    
    .character-pane:last-child .health-fill {
        background-color: var(--enemy-health);
    }
    
    .message-log {
        background-color: #333;
        border: 2px solid var(--border-color);
        padding: 1em;
        margin: 2em 0;
        min-height: 50px;
        border-radius: 5px;
        font-style: italic;
    }

    .spellbook {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1em;
    }
    
    button {
        padding: 1em;
        font-size: 1em;
        font-weight: bold;
        cursor: pointer;
        border-radius: 8px;
        border: 2px solid var(--border-color);
        background-color: #444;
        color: var(--text-color);
        transition: background-color 0.2s;
    }

    button:hover {
        background-color: #5a5a5a;
    }

    .start-button {
        padding: 1em 2em;
        font-size: 1.2em;
    }
</style>