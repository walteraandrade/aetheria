<script lang="ts">
    import './lib/i18n';
    import { t, isLoading } from 'svelte-i18n';
    import { playMelodicInterval, type Note, playGreatHarmonyTheme } from './lib/sound.engine';
    import * as Tone from 'tone';
    import { Frequency } from 'tone';
    import LanguageSwitcher from './lib/LanguageSwitcher.svelte';

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
    let message: string;
    $: message = $t('battle.start_message');
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
        'tutorial.intro_message_0',
        'tutorial.intro_message_1',
        'tutorial.intro_message_2',
        'tutorial.intro_message_3',
        'tutorial.intro_message_4',
        'tutorial.intro_message_5',
        'tutorial.intro_message_6'
    ];

    const tutorialRewardMessages: string[] = [
        'tutorial.reward_message_0',
        'tutorial.reward_message_1',
        'tutorial.reward_message_2',
        'tutorial.reward_message_3'
    ];

    interface TutorialAttack {
        type: 'higher' | 'lower' | 'equal';
        notes: [Note, Note];
    }

    const tutorialCombatSequence: TutorialAttack[] = [
        { type: 'higher', notes: ['C4', 'E4'] },
        { type: 'lower', notes: ['G4', 'D4'] },
        { type: 'equal', notes: ['F4', 'F4'] },
        { type: 'higher', notes: ['D4', 'A4'] }
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
        message = $t('battle.battle_begins');
        
        const initialSpells: SpellName[] = ['Major Third', 'Perfect Fifth'];
        choices = initialSpells.sort(() => 0.5 - Math.random());

        enemyAttack();
    }

    function getIntervalType(note1: Note, note2: Note): 'higher' | 'lower' | 'equal' {
        const freq1 = Frequency(note1).toFrequency();
        const freq2 = Frequency(note2).toFrequency();

        if (freq2 > freq1) {
            return 'higher';
        } else if (freq2 < freq1) {
            return 'lower';
        } else {
            return 'equal';
        }
    }

    function handleTutorialAction(action: 'Bend' | 'Jump' | 'Brace'): void {
        const currentAttack = tutorialCombatSequence[tutorialCombatIndex];
        if (!currentAttack) return;

        const expectedIntervalType = getIntervalType(currentAttack.notes[0], currentAttack.notes[1]);

        let mappedAction: 'higher' | 'lower' | 'equal';
        if (action === 'Bend') {
            mappedAction = 'higher';
        } else if (action === 'Jump') {
            mappedAction = 'lower';
        } else {
            mappedAction = 'equal';
        }

        if (mappedAction === expectedIntervalType) {
            enemyHealth -= 34;
            message = $t('battle.correct_action', { values: { action } });
        } else {
            playerHealth -= 25;
            message = `Wrong! It was a ${currentAnswer}. You take 25 damage!`;
        }

        tutorialCombatIndex++;

        if (enemyHealth <= 0) {
            message = $t('battle.enemy_defeated');
            tutorialPhase = 'reward';
        } else if (playerHealth <= 0) {
            message = $t('battle.player_defeated');
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
            message = $t('battle.dissonant_beast_plays', { values: { type: currentAttack.type } });
        }
    }

    function enemyAttack(): void {
        if (turnInProgress) return;
        turnInProgress = true;

        message = $t('battle.enemy_attack_message');
        
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
            } else if (tutorialMessageIndex === 1) {
                playGreatHarmonyTheme();
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
            message = $t('battle.player_defeated');
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
    <LanguageSwitcher />
    <h1>{$t('app.title')}</h1>

        {#if gameState === 'tutorial'}
            {#if tutorialPhase === 'intro'}
                <div class="message-log">{$t(tutorialIntroMessages[tutorialMessageIndex])}</div>
                <button class="start-button" on:click={advanceTutorial}>
                    Next
                </button>
            {:else if tutorialPhase === 'learningPitch'}
                {#if learningPitchStep === 0}
                    <div class="message-log">
                        <p>{$t('tutorial.learning_pitch_0')}</p>
                    </div>
                    <button class="start-button" on:click={() => { learningPitchStep = 1; }}>Next</button>
                {:else if learningPitchStep === 1}
                    <div class="message-log">
                        <p>{$t('tutorial.learning_pitch_1')}</p>
                    </div>
                    <button on:click={() => { playMelodicInterval('C4', 'G4'); }}>Play High Attack</button>
                    <button on:click={() => { learningPitchStep = 2; }}>{$t('tutorial.action_bend')}</button>
                {:else if learningPitchStep === 2}
                    <div class="message-log">
                        <p>{$t('tutorial.learning_pitch_2')}</p>
                    </div>
                    <button on:click={() => { playMelodicInterval('G4', 'C4'); }}>Play Low Attack</button>
                    <button on:click={() => { learningPitchStep = 3; }}>{$t('tutorial.action_jump')}</button>
                {:else if learningPitchStep === 3}
                    <div class="message-log">
                        <p>{$t('tutorial.learning_pitch_3')}</p>
                    </div>
                    <button on:click={() => { playMelodicInterval('E4', 'E4'); }}>Play Brace Attack</button>
                    <button on:click={() => { learningPitchStep = 4; }}>{$t('tutorial.action_brace')}</button>
                {:else if learningPitchStep === 4}
                    <div class="message-log">
                        <p>{$t('tutorial.learning_pitch_4')}</p>
                    </div>
                    <button class="start-button" on:click={() => { tutorialPhase = 'combat'; playNextTutorialAttack(); }}>Next</button>
                {/if}
            {:else if tutorialPhase === 'combat' || tutorialPhase === 'climax'}
                <div class="battle-scene">
                    <div class="character-pane">
                        <h2>{$t('character_names.player')}</h2>
                        <div class="health-bar">
                            <div class="health-fill" style="width: {playerHealth}%;"></div>
                            <span>{playerHealth} / 100 HP</span>
                        </div>
                    </div>
                    <div class="character-pane">
                        <h2>{$t('character_names.enemy_beast')}</h2>
                        <div class="health-bar">
                            <div class="health-fill" style="width: {enemyHealth}%;"></div>
                            <span>{enemyHealth} / 100 HP</span>
                        </div>
                    </div>
                </div>

                <div class="message-log">{message}</div>

                <div class="spellbook">
                    <button on:click={() => handleTutorialAction('Bend')}>{$t('tutorial.action_bend')}</button>
                    <button on:click={() => handleTutorialAction('Jump')}>{$t('tutorial.action_jump')}</button>
                    {#if tutorialCombatSequence[tutorialCombatIndex] && getIntervalType(tutorialCombatSequence[tutorialCombatIndex].notes[0], tutorialCombatSequence[tutorialCombatIndex].notes[1]) === 'equal'}
                        <button on:click={() => handleTutorialAction('Brace')}>{$t('tutorial.action_brace')}</button>
                    {/if}
                </div>
            {:else if tutorialPhase === 'reward'}
                <div class="message-log">{$t(tutorialRewardMessages[tutorialMessageIndex])}</div>
                <button class="start-button" on:click={advanceTutorial}>
                    Next
                </button>
            {/if}
        {:else if gameState === 'battle'}
            {#if !isBattling}
                <div class="message-log">{message}</div>
                <button class="start-button" on:click={startBattle}>
                    {playerHealth <= 0 ? $t('battle.start_button_try_again') : $t('battle.start_button_start_quest')}
                </button>
            {:else}
                <div class="battle-scene">
                    <div class="character-pane">
                        <h2>{$t('character_names.player')}</h2>
                        <div class="health-bar">
                            <div class="health-fill" style="width: {playerHealth}%;"></div>
                            <span>{playerHealth} / 100 HP</span>
                        </div>
                    </div>
                    <div class="character-pane">
                        <h2>{$t('character_names.enemy_imp')}</h2>
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
                            {$t('battle.cast_spell', { values: { choice } })}
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
        height: 30px;
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