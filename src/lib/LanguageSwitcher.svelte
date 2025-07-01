<script lang="ts">
  import { locale } from 'svelte-i18n';

  let placeholder = 'Select one';
</script>

<select bind:value={$locale}>
  <option value={placeholder} disabled>{placeholder}</option>
  <option value="en">English</option>
  <option value="pt">Português</option>
</select>