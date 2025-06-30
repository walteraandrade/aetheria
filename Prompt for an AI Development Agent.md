The Plan: A Step-by-Step Guide
Phase 1: Setup and Basic Implementation
Objective: Get the core translation system working for one or two pieces of text.
Install the Library:
Open your terminal in the project root.
Run the command: bun add svelte-i18n
Create the Translation Files:
In your src/lib/ folder, create a new subfolder called translations.
Inside src/lib/translations, create your language files. Start with English and one other language (e.g., Portuguese).
en.json
pt.json
Populate the JSON Files:
Your JSON files will contain key-value pairs. The "key" is the identifier you'll use in your code, and the "value" is the translated text.
File: src/lib/translations/en.json
Generated json
{
  "app": {
    "title": "Aetheria: The Sound-Sorcerer's Quest"
  },
  "tutorial": {
    "mentor_greeting": "Pay attention, Echo! The beast's dissonance is not random.",
    "action_bend": "Bend",
    "action_jump": "Jump",
    "action_brace": "Brace"
  }
}
Use code with caution.
Json
File: src/lib/translations/pt.json
Generated json
{
  "app": {
    "title": "Aetheria: A Jornada do Feiticeiro do Som"
  },
  "tutorial": {
    "mentor_greeting": "Preste atenção, Eco! A dissonância da besta não é aleatória.",
    "action_bend": "Agachar",
    "action_jump": "Pular",
    "action_brace": "Firmar"
  }
}
Use code with caution.
Json
Notice the nested structure (app.title). This is great for organization.
Initialize the Library:
Create a new file in src/lib/ called i18n.ts. This file will set up and configure the library.
File: src/lib/i18n.ts
Generated typescript
import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

// Register all your languages
register('en', () => import('./translations/en.json'));
register('pt', () => import('./translations/pt.json'));

// Initialize the library
init({
    fallbackLocale: 'en',
    initialLocale: getLocaleFromNavigator(), // Automatically detects browser language
});
Use code with caution.
TypeScript
Connect to Your App:
The final step is to import this setup file into your main component so it runs when the app starts.
At the very top of the <script> section in src/App.svelte, add:
Generated typescript
import './lib/i18n'; // Run the i18n setup
import { t } from 'svelte-i18n'; // Import the translation function
Use code with caution.
TypeScript
Use it in Your Svelte Code:
Now you can replace hard-coded text. The $t store is reactive, so if the language changes, the text will update automatically.
Before:
Generated html
<h1>Aetheria: The Sound-Sorcerer's Quest</h1>
<button>Bend</button>
Use code with caution.
Html
After:
Generated html
<h1>{$t('app.title')}</h1>
<button>{$t('tutorial.action_bend')}</button>
Use code with caution.
Html
Phase 2: Full Integration
Objective: Abstract all user-facing text into your JSON files.
Create a Language Switcher (for testing):
Build a simple UI component that allows the user to change the language. This is essential for you to test your translations.
The svelte-i18n library exports a writable store called locale. You can bind a dropdown select to it.
Example LanguageSwitcher.svelte component:
Generated html
<script lang="ts">
  import { locale } from 'svelte-i18n';
</script>

<select bind:value={$locale}>
  <option value="en">English</option>
  <option value="pt">Português</option>
</select>
Use code with caution.
Html
Externalize All Strings:
Go through your entire application (App.svelte and any other components).
Identify every single string that the user sees.
For each string, create a unique, descriptive key in your en.json file (e.g., tutorial.intro_message_1, battle.victory_message).
Replace the hard-coded string in your Svelte component with the $t('your.key.here') syntax.
This is the most time-consuming part, but it's crucial.
Phase 3: The Translation Process (Workflow)
Objective: Get your English text translated into other languages efficiently.
Establish a "Source of Truth":
Your en.json file is now the master file. All other languages will be a translation of this file. Never make content changes directly to other language files.
Choose a Translation Strategy:
Manual (You or a friend): If you are bilingual or have friends who can help, you can simply give them the en.json file and ask them to create a translated version (e.g., es.json, fr.json).
Machine Translation (for speed/prototyping): Use tools like Google Translate or DeepL to get a quick, first-pass translation of your en.json. Warning: Machine translation is often awkward and lacks nuance, especially for creative/lore text. It's a good starting point but should always be reviewed by a native speaker.
Professional Services (for quality): For a commercial release, use professional translation services. There are platforms (like Lokalise, Crowdin, or Transifex) that are designed specifically for software i18n. You upload your en.json, and professional translators provide the translations in a structured way.
Maintain and Update:
When you add a new feature with new text, the process is:
Add the new keys and English text to en.json.
Send the new keys only to your translators (or run them through machine translation).
Add the translated text to the other language files (pt.json, etc.).
