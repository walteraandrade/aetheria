<script lang="ts">
    import Phaser from 'phaser';
    import { onMount, onDestroy } from 'svelte';
    import { BattleScene } from '$lib/phaser/scenes/BattleScene';

    let game: Phaser.Game;

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'phaser-container',
        transparent: true,
        scene: [BattleScene] // Scenes will be added later
    };

    onMount(() => {
        game = new Phaser.Game(config);
    });

    onDestroy(() => {
        game.destroy(true);
    });
</script>

<div id="phaser-container"></div>