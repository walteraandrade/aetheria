<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { EventBus } from '$lib/EventBus';
    import { Frequency } from 'tone';

    let choices = $state<string[]>([]);
    let visible = $state(false);
    let playerHealth = $state(100);
    let enemyHealth = $state(100);
    let message = $state("");

    let gameState = $state<'tutorial' | 'battle' | 'map'>('tutorial');
    let tutorialPhase = $state<'intro' | 'learningPitch' | 'combat' | 'climax' | 'reward'>('intro');
    let tutorialMessageIndex = $state(0);
    let tutorialCombatIndex = $state(0);
    let learningPitchStep = $state(0);

    const tutorialIntroMessages: string[] = [
        "In the dawn of time, all of reality was woven from a single symphony—the Great Harmony.",
        "But this music has faded, corrupted by the creeping silence of the Kakophony.",
        "The world's song has become a meaningless drone. Yet you are different. You are an Echo, born with the curse and gift of hearing the faint, ghostly melodies of what was lost.",
        "Haunted by these phantom sounds, your search for answers has led you here, to the base of the legendary Tower of Vibrato, the last sanctuary of true music.",
        "You seek its guardian, Maestro Bethovan, the last master who remembers the true sound of the Weave.",
        "As you approach, a voice, powerful and sharp as a trumpet's blast, echoes from the tower's peak...",
        "Another stray Echo, drawn to the flame? The Harmony is not a toy! If the simplest dissonance of that creature overwhelms you, you are not worthy of my teachings. Prove you can even tell up from down!"
    ];

    const tutorialRewardMessages: string[] = [
        "Hmph. Not bad. You have a basic sense of pitch...",
        "You have learned: Major Third Strike!",
        "You have learned: Perfect Fifth Shield!",
        "Now the real training begins. Prepare for your first true battle."
    ];

    interface TutorialAttack {
        type: 'higher' | 'lower' | 'equal';
        notes: [string, string];
    }

    const tutorialCombatSequence: TutorialAttack[] = [
        { type: 'higher', notes: ['C4', 'E4'] },
        { type: 'lower', notes: ['G4', 'D4'] },
        { type: 'equal', notes: ['F4', 'F4'] },
        { type: 'higher', notes: ['D4', 'A4'] }
    ];

    let currentLearningPitchMessage = $derived(() => {
        switch (learningPitchStep) {
            case 0:
                return {
                    text: "Maestro Bethovan: Pay attention, Echo! The beast's dissonance is not random. It strikes high or low. You must learn to feel the difference.",
                    actions: [{ label: "Next", handler: () => { EventBus.emit('set-learning-pitch-step', 1); } }]
                };
            case 1:
                return {
                    text: "Maestro Bethovan: First, the High Attack. When its shriek rises in pitch, it aims for your head! You must BEND beneath it. Like this!",
                    actions: [
                        { label: "Play High Attack", handler: () => { EventBus.emit('play-sound', { note1: 'C4', note2: 'G4' }); } },
                        { label: "Bend", handler: () => { EventBus.emit('set-learning-pitch-step', 2); } }
                    ]
                };
            case 2:
                return {
                    text: "Maestro Bethovan: Good. Now, the Low Attack. When its growl falls in pitch, it strikes at your core! You must JUMP over it. Observe!",
                    actions: [
                        { label: "Play Low Attack", handler: () => { EventBus.emit('play-sound', { note1: 'G4', note2: 'C4' }); } },
                        { label: "Jump", handler: () => { EventBus.emit('set-learning-pitch-step', 3); } }
                    ]
                };
            case 3:
                return {
                    text: "Maestro Bethovan: Finally, the most dangerous of all. If its focus does not change pitch, it is gathering power for a direct blast! You must BRACE for the impact!",
                    actions: [
                        { label: "Play Brace Attack", handler: () => { EventBus.emit('play-sound', { note1: 'E4', note2: 'E4' }); } },
                        { label: "Brace", handler: () => { EventBus.emit('set-learning-pitch-step', 4); } }
                    ]
                };
            case 4:
                return {
                    text: "Maestro Bethovan: The lesson is over. Now, face the creature. Do not fail me.",
                    actions: [{ label: "Next", handler: () => { EventBus.emit('set-tutorial-phase', 'combat'); EventBus.emit('play-next-tutorial-attack'); } }]
                };
            default:
                return { text: "", actions: [] };
        }
    });

    onMount(() => {
        EventBus.on('show-battle-ui', handleShowUI);
        EventBus.on('update-health', handleHealthUpdate);
        EventBus.on('message', handleMessage);
        EventBus.on('set-game-state', setGameState);
        EventBus.on('set-tutorial-phase', setTutorialPhase);
        EventBus.on('set-tutorial-message-index', setTutorialMessageIndex);
        EventBus.on('set-learning-pitch-step', setLearningPitchStep);
        EventBus.on('set-tutorial-combat-index', setTutorialCombatIndex);
    });

    onDestroy(() => {
        EventBus.off('show-battle-ui');
        EventBus.off('update-health');
        EventBus.off('message');
        EventBus.off('set-game-state');
        EventBus.off('set-tutorial-phase');
        EventBus.off('set-tutorial-message-index');
        EventBus.off('set-learning-pitch-step');
        EventBus.off('set-tutorial-combat-index');
    });

    function setGameState(state: 'tutorial' | 'battle' | 'map'): void {
        gameState = state;
    }

    function setTutorialPhase(phase: 'intro' | 'learningPitch' | 'combat' | 'climax' | 'reward'): void {
        tutorialPhase = phase;
    }

    function setTutorialMessageIndex(index: number): void {
        tutorialMessageIndex = index;
    }

    function setLearningPitchStep(step: number): void {
        learningPitchStep = step;
    }

    function setTutorialCombatIndex(index: number): void {
        tutorialCombatIndex = index;
    }

    function handleShowUI(event: { choices: string[] }): void {
        choices = event.choices;
        visible = true;
    }

    function handleHealthUpdate(event: { type: 'player' | 'enemy', health: number }): void {
        if (event.type === 'player') {
            playerHealth = event.health;
        } else {
            enemyHealth = event.health;
        }
    }

    function handleMessage(msg: string): void {
        message = msg;
    }

    function onButtonClick(choice: string): void {
        console.log('Emitting player-action:', choice);
        EventBus.emit('player-action', choice);
        visible = false;
    }

    function advanceTutorial(): void {
        console.log('Emitting advance-tutorial');
        EventBus.emit('advance-tutorial');
    }

    function handleTutorialAction(action: 'Bend' | 'Jump' | 'Brace'): void {
        console.log('Emitting handle-tutorial-action:', action);
        EventBus.emit('handle-tutorial-action', action);
    }

    function getIntervalType(note1: string, note2: string): 'higher' | 'lower' | 'equal' {
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
</script>

{#if gameState === 'tutorial'}
    {#if tutorialPhase === 'intro'}
        <div class="battle-ui-container">
            <div class="message-log">{tutorialIntroMessages[tutorialMessageIndex]}</div>
            <button class="start-button" onclick={advanceTutorial}>
                Next
            </button>
        </div>
    {:else if tutorialPhase === 'learningPitch'}
        <div class="battle-ui-container">
            <div class="message-log">
                <p>{currentLearningPitchMessage().text}</p>
            </div>
            {#each currentLearningPitchMessage().actions as action}
                <button class="start-button" onclick={action.handler}>{action.label}</button>
            {/each}
        </div>
    {:else if tutorialPhase === 'combat' || tutorialPhase === 'climax'}
        <div class="battle-ui-container">
            <div class="health-bars">
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
                <button onclick={() => handleTutorialAction('Bend')}>Bend</button>
                <button onclick={() => handleTutorialAction('Jump')}>Jump</button>
                {#if tutorialCombatSequence[tutorialCombatIndex] && getIntervalType(tutorialCombatSequence[tutorialCombatIndex].notes[0], tutorialCombatSequence[tutorialCombatIndex].notes[1]) === 'equal'}
                    <button onclick={() => handleTutorialAction('Brace')}>Brace</button>
                {/if}
            </div>
        </div>
    {:else if tutorialPhase === 'reward'}
        <div class="battle-ui-container">
            <div class="message-log">{tutorialRewardMessages[tutorialMessageIndex]}</div>
            <button class="start-button" onclick={advanceTutorial}>
                Next
            </button>
        </div>
    {/if}
{:else if gameState === 'battle'}
    {#if !visible}
        <div class="battle-ui-container">
            <div class="message-log">{message}</div>
            <button class="start-button" onclick={() => EventBus.emit('start-battle')}>
                {playerHealth <= 0 ? 'Try Again' : 'Start Your Quest'}
            </button>
        </div>
    {:else}
        <div class="battle-ui-container">
            <div class="health-bars">
                <div class="character-pane">
                    <h2>Sound-Sorcerer</h2>
                    <div class="health-bar">
                        <div class="health-fill" style="width: {playerHealth}%;"></div>
                        <span>{playerHealth} / 100 HP</span>
                    </div>
                </div>
                <div class="character-pane">
                    <h2>Shrieking Imp</h2>
                    <div class="health-fill" style="width: {enemyHealth}%;"></div>
                    <span>{enemyHealth} / 100 HP</span>
                </div>
            </div>

            <div class="message-log">{message}</div>

            <div class="spellbook">
                {#each choices as choice}
                    <button onclick={() => onButtonClick(choice)}>
                        Cast "{choice}"
                    </button>
                {/each}
            </div>
        </div>
    {/if}
{:else if gameState === 'map'}
    <h1>World Map</h1>
{/if}

<style>
    .battle-ui-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
    }

    .health-bars {
        display: flex;
        justify-content: space-around;
        width: 100%;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        pointer-events: auto;
    }

    .message-log {
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        margin-top: auto; /* Pushes it to the bottom */
        pointer-events: auto;
    }

    .spellbook {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1em;
    }
    
    .spellbook button {
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

    .spellbook button:hover {
        background-color: #5a5a5a;
    }

    .start-button {
        padding: 1em 2em;
        font-size: 1.2em;
    }
</style>