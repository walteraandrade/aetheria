/// <reference types="svelte" />
/// <reference types="vite/client" />

// Add type definitions for $lib alias
declare module '$lib/EventBus' {
    import { EventEmitter } from 'phaser';
    export const EventBus: EventEmitter;
}
