import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('en', () => import('./translations/en.json'));
register('pt', () => import('./translations/pt.json'));

export const i18nInit = (async () => {
    await init({
        fallbackLocale: 'en',
        initialLocale: getLocaleFromNavigator(),
    });
})();