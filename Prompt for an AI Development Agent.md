Excellent decision. Here is a detailed, step-by-step plan designed to guide your AI agent through the architectural migration to a Phaser + Svelte hybrid model. The instructions are precise where the path is clear and suggest research where implementation details can vary.

Prompt for an AI Development Agent

Project Goal:
"We are migrating 'Aetheria' from a pure Svelte+DOM application to a hybrid architecture. Phaser will be responsible for rendering the core game world (characters, animations, effects) within a <canvas> element. Svelte will be responsible for rendering the UI (buttons, menus, text boxes) as an HTML layer on top of the canvas. The two layers must communicate effectively."

Phase 1: Project Setup & Foundation

Instruction (Step 1.1): Install Phaser
"In the project's root directory, add Phaser to our dependencies. Run the following command:"

Generated bash
bun add phaser


Instruction (Step 1.2): Create the Communication Bridge
"We need a simple, centralized way for Svelte and Phaser to communicate without being tightly coupled. An event emitter is the ideal pattern.

Create a new file at src/lib/EventBus.ts.

Inside this file, we will use Phaser's built-in EventEmitter. This avoids adding another dependency.

Instantiate and export a single, shared instance of the emitter. The file content should be:

Generated typescript
import Phaser from 'phaser';
export const EventBus = new Phaser.Events.EventEmitter();
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

This EventBus will now be importable by both Svelte components and Phaser scenes."

Instruction (Step 1.3): Create the Main Phaser Game Component
"We need a Svelte component that will be responsible for creating, holding, and destroying the Phaser game instance.

Create a new Svelte component at src/lib/components/PhaserGame.svelte.

In the <script> section:

Import Phaser, onMount, and onDestroy.

Declare a let game: Phaser.Game; variable.

Define a config object for the Phaser game. This is a crucial step.

type: Phaser.AUTO (let Phaser decide between WebGL and Canvas).

width: 800 (or your desired width).

height: 600 (or your desired height).

parent: 'phaser-container' (This tells Phaser where to inject the canvas).

transparent: true (This is VERY important, it allows the HTML UI behind it to be visible if needed, though we will overlay).

scene: [] (We will add scenes later).

Use the onMount Svelte lifecycle hook to initialize the game: game = new Phaser.Game(config);.

Use the onDestroy Svelte lifecycle hook to clean up the game instance: game.destroy(true);.

In the HTML section:

Create a single <div> with the id that matches the parent property in your config: <div id="phaser-container"></div>.

Instruction (Step 1.4): Integrate the Phaser Component into App.svelte
"Modify src/App.svelte to use our new PhaserGame component.

Import PhaserGame.svelte.

In the main layout of your app, place the <PhaserGame /> component.

Structure your App.svelte HTML so that the UI elements (which we will build next) are siblings or overlays to the PhaserGame component. A common approach is to use a main wrapper <div> with position: relative;, and then position the Phaser container and the UI container inside it.

At this point, running the app should show a blank 800x600 Phaser canvas."

Phase 2: Porting the Battle Scene

Instruction (Step 2.1): Create the Battle Scene File
"Create a new file for our first Phaser scene at src/lib/phaser/scenes/BattleScene.ts.

Import Phaser and our EventBus.

Define and export a class BattleScene that extends Phaser.Scene.

Give it a constructor where it calls super({ key: 'BattleScene' });.

Add the three core methods: preload(), create(), and update(). Leave them empty for now."

Instruction (Step 2.2): Load the Scene and Assets
"We need to tell Phaser to use our new scene and load any assets we need.

In PhaserGame.svelte, import BattleScene.

In the config object, update the scene property to [BattleScene].

In BattleScene.ts, inside the preload() method, we will load placeholder assets. Since we don't have sprites yet, we can generate them. Agent, search the web for 'Phaser 3 generate placeholder graphics' or 'Phaser make.graphics'. You will find methods to create simple colored rectangles to represent the player and enemy.

Example: this.load.image('player', ...) or create a texture.

Instruction (Step 2.3): Implement Scene Logic and Communication
"Now, let's wire up the logic in BattleScene.ts.

In the create() method:

Add the player and enemy sprites to the scene using this.add.sprite(...).

Set up listeners for events coming from the Svelte UI. Use the EventBus for this:

Generated typescript
EventBus.on('player-action', this.handlePlayerAction, this);
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

When the scene is destroyed, we must clean up listeners. Add a listener for the scene's shutdown event: this.events.on('shutdown', () => { EventBus.off('player-action'); });.

To start the first turn, emit an event to the Svelte UI to tell it to show the action buttons.

Generated typescript
// This would be called from an enemyAttack() method
EventBus.emit('show-battle-ui', { choices: ['Bend', 'Jump', 'Brace'] });
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Create the handlePlayerAction(action: string) method within the BattleScene class. This method will contain the logic to check if the action was correct, update health, and trigger attack/damage animations.

Create an enemyAttack() method. This method will play the sound (using tone.js which can be imported directly), trigger a monster attack animation, and emit the event for the UI to show itself.

Animations: Use Phaser's tweening system (this.tweens.add({...})) to create simple attack animations (e.g., a sprite moving forward and back)."

Phase 3: Rebuilding the UI in Svelte

Instruction (Step 3.1): Create the Svelte Battle UI Component
"Create a new Svelte component at src/lib/components/BattleUI.svelte. This component will render all the buttons and text overlays.

In the <script> section:

Import onMount, onDestroy, and our EventBus.

Set up listeners for events coming from Phaser:

Generated typescript
onMount(() => {
    EventBus.on('show-battle-ui', handleShowUI);
    EventBus.on('update-health', handleHealthUpdate); // Example
});
onDestroy(() => {
    EventBus.off('show-battle-ui');
    EventBus.off('update-health');
});
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

The handleShowUI function will set component state (e.g., let choices = event.choices; let visible = true;).

Create a function onButtonClick(choice: string) that emits the player's action to Phaser: EventBus.emit('player-action', choice); and then hides the UI.

In the HTML section:

Use {#if visible} to control the visibility of the UI.

Render the health bars, message log, and action buttons based on component state.

Use CSS with position: absolute; to overlay this UI on top of the Phaser canvas.

Instruction (Step 3.2): Final Integration
"In App.svelte, place your new <BattleUI /> component as a sibling to the <PhaserGame /> component. Use CSS to ensure the UI layer sits correctly on top of the game canvas. The structure should look something like this:"

Generated html
<div class="game-wrapper" style="position: relative;">
  <PhaserGame />
  <BattleUI />
</div>
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Html
IGNORE_WHEN_COPYING_END

Agent, for advanced styling and layout of the Svelte UI over the Phaser canvas, you may need to research 'CSS position absolute', 'z-index', and 'pointer-events: none' to allow clicks to pass through UI elements when they are not active."