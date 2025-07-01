import { mount } from 'svelte';
import App from './App.svelte';
import { init, getLocaleFromNavigator } from 'svelte-i18n';
import './app.css';

await init({
  fallbackLocale: 'en',
  initialLocale: getLocaleFromNavigator(),
});

mount(App, {
  target: document.getElementById('app')!,
});
