import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('en', () => import('./translations/en.json'));
register('pt', () => import('./translations/pt.json'));

// remove the init call from here
