import Phaser from 'phaser';
import { EventBus } from '$lib/EventBus';
import * as Tone from 'tone';
import { Frequency } from 'tone';
import { playMelodicInterval, playGreatHarmonyTheme } from '$lib/sound.engine';

export class BattleScene extends Phaser.Scene {
    private playerHealth: number = 100;
    private enemyHealth: number = 100;
    private message: string = "A wild Shrieking Imp appears! Prepare for battle.";
    private choices: string[] = [];
    private currentAnswer: string | null = null;
    private isBattling: boolean = false;
    private turnInProgress: boolean = false;

    private tutorialPhase: 'intro' | 'learningPitch' | 'combat' | 'climax' | 'reward' = 'intro';
    private tutorialMessageIndex: number = 0;
    private tutorialCombatIndex: number = 0;
    private learningPitchStep: number = 0;

    private tutorialIntroMessages: string[] = [
        "In the dawn of time, all of reality was woven from a single symphony—the Great Harmony.",
        "But this music has faded, corrupted by the creeping silence of the Kakophony.",
        "The world's song has become a meaningless drone. Yet you are different. You are an Echo, born with the curse and gift of hearing the faint, ghostly melodies of what was lost.",
        "Haunted by these phantom sounds, your search for answers has led you here, to the base of the legendary Tower of Vibrato, the last sanctuary of true music.",
        "You seek its guardian, Maestro Bethovan, the last master who remembers the true sound of the Weave.",
        "As you approach, a voice, powerful and sharp as a trumpet's blast, echoes from the tower's peak...",
        "Another stray Echo, drawn to the flame? The Harmony is not a toy! If the simplest dissonance of that creature overwhelms you, you are not worthy of my teachings. Prove you can even tell up from down!"
    ];

    private tutorialRewardMessages: string[] = [
        "Hmph. Not bad. You have a basic sense of pitch...",
        "You have learned: Major Third Strike!",
        "You have learned: Perfect Fifth Shield!",
        "Now the real training begins. Prepare for your first true battle."
    ];

    private tutorialCombatSequence: { type: 'higher' | 'lower' | 'equal'; notes: [string, string]; }[] = [
        { type: 'higher', notes: ['C4', 'E4'] },
        { type: 'lower', notes: ['G4', 'D4'] },
        { type: 'equal', notes: ['F4', 'F4'] },
        { type: 'higher', notes: ['D4', 'A4'] }
    ];

    private spellbook: Record<string, { name: string; notes: [string, string]; description: string; }> = {
        'Major Third': { name: 'Major Third', notes: ['C4', 'E4'], description: 'A bright, happy sound.' },
        'Perfect Fifth': { name: 'Perfect Fifth', notes: ['C4', 'G4'], description: 'A stable, heroic sound.' },
        'Minor Third': { name: 'Minor Third', notes: ['C4', 'Eb4'], description: 'A sad, thoughtful sound.' },
        'Tritone': { name: 'Tritone', notes: ['C4', 'F#4'], description: 'A dissonant, unstable sound.' }
    };

    constructor() {
        super({ key: 'BattleScene' });
    }

    preload(): void {
        // Create simple colored rectangles as textures
        this.createRectTexture('player_rect', 0x00ff00);
        this.createRectTexture('enemy_rect', 0xff0000);
    }

    private createRectTexture(key: string, color: number): void {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, 50, 100);
        graphics.generateTexture(key, 50, 100);
        graphics.destroy();
    }

    create(): void {
        // Add the player and enemy sprites to the scene
        this.add.sprite(100, 300, 'player_rect').setOrigin(0.5).setName('player_sprite');
        this.add.sprite(700, 300, 'enemy_rect').setOrigin(0.5).setName('enemy_sprite');

        // Implement scene logic here
        EventBus.on('player-action', (choice: string) => {
            console.log('Received player-action:', choice);
            this.handlePlayerAction(choice);
        });
        EventBus.on('start-battle', () => {
            console.log('Received start-battle');
            this.startBattle();
        });
        EventBus.on('play-sound', (data: { note1: string, note2: string }) => {
            console.log('Received play-sound:', data);
            playMelodicInterval(data.note1, data.note2);
        });
        EventBus.on('play-great-harmony-theme', () => {
            console.log('Received play-great-harmony-theme');
            playGreatHarmonyTheme();
        });
        EventBus.on('play-next-tutorial-attack', () => {
            console.log('Received play-next-tutorial-attack');
            this.playNextTutorialAttack();
        });
        EventBus.on('handle-tutorial-action', (action: 'Bend' | 'Jump' | 'Brace') => {
            console.log('Received handle-tutorial-action:', action);
            this.handleTutorialAction(action);
        });
        EventBus.on('advance-tutorial', () => {
            console.log('Received advance-tutorial');
            this.advanceTutorial();
        });

        this.events.on('shutdown', () => {
            EventBus.off('player-action');
            EventBus.off('start-battle');
            EventBus.off('play-sound');
            EventBus.off('play-great-harmony-theme');
            EventBus.off('play-next-tutorial-attack');
            EventBus.off('handle-tutorial-action');
            EventBus.off('advance-tutorial');
        });

        // Start the game/tutorial
        EventBus.emit('set-game-state', 'tutorial');
        EventBus.emit('set-tutorial-phase', 'intro');
        EventBus.emit('set-tutorial-message-index', 0);
    }

    async startBattle(): Promise<void> {
        await Tone.start();
        console.log("Audio Context is ready.");

        this.isBattling = true;
        this.playerHealth = 100;
        this.enemyHealth = 100;
        EventBus.emit('update-health', { type: 'player', health: this.playerHealth });
        EventBus.emit('update-health', { type: 'enemy', health: this.enemyHealth });
        EventBus.emit('message', "The battle begins!");
        
        const initialSpells = ['Major Third', 'Perfect Fifth'];
        this.choices = initialSpells.sort(() => 0.5 - Math.random());

        this.enemyAttack();
    }

    enemyAttack(): void {
        if (this.turnInProgress) return;
        this.turnInProgress = true;

        EventBus.emit('message', "The Imp shrieks a dissonant sound...");
        
        const availableSpells = Object.keys(this.spellbook);
        const randomSpellName = availableSpells[Math.floor(Math.random() * availableSpells.length)];
        this.currentAnswer = randomSpellName;
        
        const notesToPlay = this.spellbook[randomSpellName].notes;

        this.generateChoices(randomSpellName);
        playMelodicInterval(notesToPlay[0], notesToPlay[1]);
    }

    public handlePlayerAction(choice: string): void {
        if (!this.isBattling || !this.turnInProgress || this.currentAnswer === null) return;

        if (choice === this.currentAnswer) {
            this.enemyHealth -= 34;
            EventBus.emit('update-health', { type: 'enemy', health: this.enemyHealth });
            EventBus.emit('message', `Correct! You cast "${choice}" and deal 34 damage!`);
        } else {
            this.playerHealth -= 25;
            EventBus.emit('update-health', { type: 'player', health: this.playerHealth });
            EventBus.emit('message', `Wrong! It was a ${this.currentAnswer}. You take 25 damage!`);
        }

        if (this.enemyHealth <= 0) {
            EventBus.emit('message', "You have defeated the Shrieking Imp! Victory!");
            this.isBattling = false;
        } else if (this.playerHealth <= 0) {
            EventBus.emit('message', "You have been defeated... The world remains in dissonance.");
            this.isBattling = false;
        }
        else {
            this.time.delayedCall(2000, () => {
                this.turnInProgress = false;
                if (this.isBattling) this.enemyAttack();
            });
        }
    }

    private getIntervalType(note1: string, note2: string): 'higher' | 'lower' | 'equal' {
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

    handleTutorialAction(action: 'Bend' | 'Jump' | 'Brace'): void {
        const currentAttack = this.tutorialCombatSequence[this.tutorialCombatIndex];
        if (!currentAttack) return;

        const expectedIntervalType = this.getIntervalType(currentAttack.notes[0], currentAttack.notes[1]);

        let mappedAction: 'higher' | 'lower' | 'equal';
        if (action === 'Bend') {
            mappedAction = 'higher';
        } else if (action === 'Jump') {
            mappedAction = 'lower';
        } else {
            mappedAction = 'equal';
        }

        if (mappedAction === expectedIntervalType) {
            this.enemyHealth -= 34;
            EventBus.emit('update-health', { type: 'enemy', health: this.enemyHealth });
            EventBus.emit('message', `Correct! You chose ${action} and deal 34 damage!`);
        } else {
            this.playerHealth -= 25;
            EventBus.emit('update-health', { type: 'player', health: this.playerHealth });
            EventBus.emit('message', `Wrong! It was a ${this.currentAnswer}. You take 25 damage!`);
        }

        this.tutorialCombatIndex++;
        EventBus.emit('set-tutorial-combat-index', this.tutorialCombatIndex);

        if (this.enemyHealth <= 0) {
            EventBus.emit('message', "You have defeated the Dissonant Beast! Victory!");
            this.tutorialPhase = 'reward';
            EventBus.emit('set-tutorial-phase', this.tutorialPhase);
        } else if (this.playerHealth <= 0) {
            EventBus.emit('message', "You have been defeated... The world remains in dissonance.");
        } else if (this.tutorialCombatIndex >= this.tutorialCombatSequence.length) {
            this.tutorialPhase = 'reward';
            EventBus.emit('set-tutorial-phase', this.tutorialPhase);
        } else {
            this.time.delayedCall(2000, () => {
                this.playNextTutorialAttack();
            });
        }
    }

    playNextTutorialAttack(): void {
        const currentAttack = this.tutorialCombatSequence[this.tutorialCombatIndex];
        if (currentAttack) {
            playMelodicInterval(currentAttack.notes[0], currentAttack.notes[1]);
            EventBus.emit('message', `The Dissonant Beast plays a ${currentAttack.type} interval.`);
        }
    }

    generateChoices(correctAnswer: string): void {
        let allSpells = Object.keys(this.spellbook);
        let wrongAnswers = allSpells.filter(spell => spell !== correctAnswer);
        wrongAnswers.sort(() => 0.5 - Math.random());
        
        let finalChoices = [correctAnswer, wrongAnswers[0], wrongAnswers[1]];
        this.choices = finalChoices.sort(() => 0.5 - Math.random());
    }

    advanceTutorial(): void {
        if (this.tutorialPhase === 'intro') {
            this.tutorialMessageIndex++;
            EventBus.emit('set-tutorial-message-index', this.tutorialMessageIndex);
            if (this.tutorialMessageIndex >= this.tutorialIntroMessages.length) {
                this.tutorialPhase = 'learningPitch';
                EventBus.emit('set-tutorial-phase', this.tutorialPhase);
                this.tutorialMessageIndex = 0;
                EventBus.emit('set-tutorial-message-index', this.tutorialMessageIndex);
            } else if (this.tutorialMessageIndex === 1) {
                playGreatHarmonyTheme();
            }
        } else if (this.tutorialPhase === 'reward') {
            this.tutorialMessageIndex++;
            EventBus.emit('set-tutorial-message-index', this.tutorialMessageIndex);
            if (this.tutorialMessageIndex >= this.tutorialRewardMessages.length) {
                EventBus.emit('set-game-state', 'battle');
                this.startBattle();
            }
        }
    }
}
