// store/KeyBindingsStore.js
import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

export const useShortcutStore = defineStore('shortcuts',() => {
    const defaultKeyBindings = ref({
      'normal': '1',
      'missing-center-salami': '2',
      'one-center-salami': '3',
      'extra-salami': '4',
      'wrong-slices': '5',
    })

    const globalShortcuts = ref({
      'CTRL + A': 'add new class',
      'CTRL + I': 'center image',
      'CTRL + C': 'copy annotation',
      'CTRL + V': 'paste annotation',
      'CTRL + Z': 'undo',
      'CTRL + O': 'open project',
      'CTRL + S': 'save project',
      'CTRL + E': 'export project',
    })

    const pizzaDefectKeys = new Set(Object.keys(defaultKeyBindings.value));
    const oldCiliaKeys = new Set(['disarranged', 'extra-tuble', 'single-tuble', 'compound', 'transposition', 'one-of-pair-missing', 'both-missing']);
    const removedDefects = new Set(['other-defect']);

    const storedBindings = JSON.parse(localStorage.getItem('userKeyBindings')) || [];
    const hasOldKeys = storedBindings.some(b => oldCiliaKeys.has(b.key));
    const hasRemovedKeys = storedBindings.some(b => removedDefects.has(b.key));
    const cleanedBindings = hasOldKeys ? [] : storedBindings.filter(b => !removedDefects.has(b.key));
    const userKeyBindings = ref((hasOldKeys || hasRemovedKeys) ? cleanedBindings : storedBindings);

    const saveKeyBindings = () => {
      localStorage.setItem('userKeyBindings', JSON.stringify(userKeyBindings.value));
    }

    if(userKeyBindings.value.length === 0) {
      userKeyBindings.value = Object.entries(defaultKeyBindings.value).map(([key, value]) => ({ key, value }));
      saveKeyBindings();
    }

    const updateKeyBinding = (defect, newKey) =>{
      userKeyBindings.value = userKeyBindings.value.filter((binding) => binding.key !== defect && binding.value !== newKey);
      userKeyBindings.value.push(
        {"key": defect, "value": newKey});
    }

    const deleteKeyBinding = (defect) => {
      defaultKeyBindings.value = defaultKeyBindings.value.filter((binding) => binding.key !== defect);
      saveKeyBindings();
    }

    const getKeyBinding = (defect) => {
      return computed(() => {
        const userBindings = userKeyBindings.value.reduce((acc,current) => {acc[current.key] = current.value; return acc}, {})
        return userBindings[defect];
      })
    }

    const getDefaultAndUserKeyBindings = computed(() => {
      return userKeyBindings.value.reduce((acc,current) => {acc[current.key] = current.value; return acc}, {})
    } )

    const getGlobalShortcuts = computed(() => {
      return globalShortcuts.value;
    })

  return {
    defaultKeyBindings,
    globalShortcuts,
    userKeyBindings,
    saveKeyBindings,
    updateKeyBinding,
    getKeyBinding,
    deleteKeyBinding,
    getDefaultAndUserKeyBindings,
    getGlobalShortcuts
  };
});
