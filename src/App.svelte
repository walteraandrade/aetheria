<script lang="ts">
    import PhaserGame from './lib/components/PhaserGame.svelte';
    import BattleUI from './lib/components/BattleUI.svelte';
</script>

<main>
    <h1>Aetheria: The Sound-Sorcerer's Quest</h1>

    <div class="game-wrapper" style="position: relative;">
        <PhaserGame />
        <BattleUI />
    </div>
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

    .game-wrapper {
        position: relative;
        width: 800px; /* Match Phaser game width */
        height: 600px; /* Match Phaser game height */
        margin: 0 auto;
        overflow: hidden;
    }
</style>