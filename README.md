# Aetheria: The Sound-Sorcerer's Quest

## Project Overview

**Aetheria: The Sound-Sorcerer's Quest** is an **RPG Ear-Training Game** where the world of Aetheria was shattered by a malevolent entity called **The Kakophony**, destroying the world's Harmony. The player is a **Sound-Sorcerer** who must re-learn the ancient **Harmonic Arts** to battle monsters of dissonance and restore music to the world.

The core loop of the game involves: Learn a musical concept -> Battle a monster that uses that concept -> Gain XP -> Unlock a new, more complex musical concept.

This innovative project seamlessly blends rich interactive gameplay with a dynamic user interface through a hybrid architecture. The core game world, including characters, animations, and dazzling musical effects, is rendered using **Phaser.js** within a dedicated `<canvas>` element. Complementing this, the entire user interface—encompassing intuitive buttons, immersive menus, and vital text displays—is meticulously crafted with **Svelte**, rendered as a responsive HTML overlay. This unique approach ensures a seamless and responsive experience, where the game's visual depth meets the flexibility and reactivity of a modern web UI, making music learning an adventure you'll actually want to embark on.

## Features

*   **Engaging Music-Learning RPG:** Transform abstract musical concepts into tangible in-game abilities. Learn pitch, intervals, and harmony by actively playing and progressing through a captivating story.
*   **Hybrid Architecture:** Leverages Phaser.js for high-performance game rendering and Svelte for a reactive, component-based UI layer, ensuring both stunning visuals and a fluid user experience.
*   **Event-Driven Communication:** A centralized `EventBus` (built on Phaser's EventEmitter) facilitates decoupled and efficient communication between the Phaser game instance and Svelte UI components, guaranteeing real-time responsiveness.
*   **Interactive Tutorial System:** A guided, in-game tutorial introduces players to the game's unique musical mechanics, including pitch recognition and combat actions, making learning intuitive and fun.
*   **Dynamic Battle System:** Engage in thrilling musical battles where your understanding of intervals directly influences your success. Player choices trigger powerful musical attacks and defenses, with real-time health updates and immersive messages.
*   **Responsive UI:** Svelte-powered UI elements are designed to overlay the Phaser canvas effectively, providing a cohesive and visually appealing user experience across various devices.

## Technologies Used

*   **Svelte 5:** A modern JavaScript framework for building reactive user interfaces, ensuring a smooth and dynamic UI.
*   **Phaser 3:** A fast, free, and fun open-source HTML5 game framework, powering the engaging game world.
*   **Tone.js:** A powerful web audio framework for creating interactive musical experiences, bringing the game's core mechanics to life.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript, enhancing code quality, maintainability, and developer productivity.
*   **Vite:** A lightning-fast build tool that provides an incredibly quick development experience, allowing for rapid iteration.
*   **Bun:** A fast all-in-one JavaScript runtime, optimizing development and build processes.

## Project Structure

The project follows a clear and modular structure, designed for scalability and ease of development:

```
aetheria-ts/
├── src/
│   ├── app.css
│   ├── App.svelte             # Main Svelte application component, integrates PhaserGame and BattleUI
│   ├── main.ts                # Entry point for the Svelte application
│   ├── vite-env.d.ts
│   ├── assets/
│   │   └── svelte.svg
│   ├── lib/
│   │   ├── EventBus.ts        # Centralized event emitter for Svelte-Phaser communication
│   │   ├── sound.engine.ts    # Tone.js sound utilities
│   │   ├── components/
│   │   │   ├── BattleUI.svelte    # Svelte component for the game's overlay UI (health, messages, buttons)
│   │   │   └── PhaserGame.svelte  # Svelte component to manage the Phaser game instance
│   │   └── phaser/
│   │       └── scenes/
│   │           └── BattleScene.ts # Phaser scene containing core game logic (tutorial, combat)
├── public/
│   └── vite.svg
├── .git/
├── .vscode/
├── dist/
├── node_modules/
├── bun.lock
├── index.html
├── LICENSE
├── package.json
├── Prompt for an AI Development Agent.md
├── README.md
├── svelte.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Getting Started

To set up and run the Aetheria project locally, transforming your music learning journey, follow these steps:

### Prerequisites

Ensure you have [Bun](https://bun.sh/docs/installation) installed on your system.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd aetheria-ts
    ```

2.  **Install dependencies:**

    ```bash
    bun install
    ```

### Running the Development Server

To start the development server and embark on your musical adventure:

```bash
bun dev
```

Open your browser to `http://localhost:5173/` (or the address shown in your console) and prepare to learn music like never before!

### Building for Production

To build the project for a high-performance production deployment:

```bash
bun run build
```

This will generate optimized static assets in the `dist` directory, ready for deployment.

### Type Checking

To run rigorous type checks and ensure the highest code quality:

```bash
bun run check
```

## Gameplay: Learn Music by Playing!

"Aetheria" introduces players to a vibrant world where music isn't just an art form—it's the very fabric of reality and your most potent weapon. Forget dry textbooks and repetitive exercises. Here, you'll learn music by *doing*.

Your journey begins with a personalized tutorial guided by the wise Maestro Bethovan. He won't just tell you about pitch and musical intervals; he'll challenge you to *feel* them. You'll learn to identify "higher," "lower," and "equal" intervals not by rote memorization, but by defending against dissonant creatures and unleashing powerful musical attacks. Every correct identification strengthens your character and advances your quest.

As you progress, the game seamlessly integrates more complex musical concepts into thrilling combat scenarios. Your ability to perceive and respond to musical cues directly impacts your success in battle, making every encounter a dynamic and engaging learning opportunity. "Aetheria" transforms the often-boring process of music education into an epic RPG adventure, proving that learning can be as exciting as any fantasy quest.

## Architecture Deep Dive

The project's hybrid architecture is designed for modularity, performance, and a truly engaging user experience:

*   **Phaser.js (`src/lib/phaser/scenes/BattleScene.ts`):** The powerhouse behind the game world. It handles all game-world rendering, including dynamic sprites, fluid animations, and intricate game state logic. It meticulously manages player and enemy health, orchestrates turn progression, and triggers immersive sound effects via `Tone.js`, bringing the musical battles to life.
*   **Svelte (`src/lib/components/BattleUI.svelte`):** The elegant and reactive engine driving the entire overlay UI. This includes the informative message log, dynamic health bars, and interactive buttons for player actions. Svelte's unparalleled reactivity ensures the UI updates seamlessly and instantly in response to every subtle nuance of the game's events, providing a polished and intuitive interface.
*   **EventBus (`src/lib/EventBus.ts`):** The central nervous system of the application. This crucial communication layer, built on Phaser's robust EventEmitter, facilitates decoupled and highly efficient communication. Phaser scenes emit events (e.g., `update-health`, `message`, `show-battle-ui`) that Svelte components intelligently listen to, updating the UI accordingly. Conversely, Svelte UI components emit events (e.g., `player-action`, `advance-tutorial`, `start-battle`) that Phaser scenes listen to, triggering precise game logic. This clear separation of concerns allows for independent development, optimization, and a highly flexible and powerful game development pipeline.

## Future Enhancements

*   **Expanded Musical Curriculum:** Introduce more complex musical intervals, chords, scales, and corresponding spells and challenges.
*   **Diverse Dissonant Foes:** Implement a wider variety of unique dissonant creatures, each requiring different musical strategies to defeat.
*   **Immersive World Map & Progression:** Develop a visually stunning and interactive world map in Svelte, allowing players to track their progress, unlock new musical regions, and discover hidden challenges.
*   **Enhanced Visual Effects:** Implement more sophisticated animations, particle effects, and visual feedback to further immerse players in the musical world.
*   **Rich Sound Design:** Integrate a more expansive soundscape with adaptive background music that evolves with gameplay, and a wider array of nuanced sound effects for every musical interaction.
*   **Robust Save/Load System:** Implement seamless functionality to save and load game progress, allowing players to continue their musical journey at any time.
*   **Multiplayer Musical Duels:** Explore the possibility of real-time musical duels against other players, testing their harmonic prowess in competitive play.