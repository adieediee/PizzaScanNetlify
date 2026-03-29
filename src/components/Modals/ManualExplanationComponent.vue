<template>
  <div id="ManualTutorialModal" ref="explanationBox" class="explanation">
    <div class="top-bar">
      <p class="bold">{{$t('manualAnnotationTutorial.title')}}</p>
      <div class="top-buttons">
        <button class="btn btn-icon" @click="toggleMinimize">
            <fa v-if="!isMinimized" :icon="['fas', 'minus']" />
            <fa v-else :icon="['fas', 'plus']" />
        </button>
        <button class="btn btn-icon" @click="closeTutorial">
          <fa :icon="['fas', 'xmark']" />
        </button>
      </div>
    </div>
    <div v-if="!isMinimized" class="content">
      <div>{{$t('manualAnnotationTutorial.step' + boardingStore.manualCurrentStep)}}</div>
    </div>
    <div v-if="!isMinimized" class="controls">
      <button id="ManualTutorialModalBackButton" class="btn btn-outlined step-btn" @click="prevStep" :disabled="boardingStore.manualCurrentStep === 1">{{$t('general.backButton')}}</button>
      <p class="steps">{{ boardingStore.manualCurrentStep }} {{$t('manualAnnotationTutorial.steps')}}</p>
      <button id="ManualTutorialModalNextButton" class="btn btn-filled step-btn" @click="nextStep">{{ nextButtonText }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useBoardingStore } from '@/stores/BoardingStore';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  text: {
    type: String,
    required: true
  }
});

const boardingStore = useBoardingStore();
const { t } = useI18n();

const isMinimized = ref(false);

const nextButtonText = computed(() => {
  return boardingStore.manualCurrentStep === 7 ? t('general.finishButton') : t('general.nextButton');
});

function nextStep() {
  boardingStore.setManualCurrentStep(boardingStore.manualCurrentStep + 1);
}

function prevStep() {
  boardingStore.setManualCurrentStep(boardingStore.manualCurrentStep - 1);
}

function toggleMinimize() {
  isMinimized.value = !isMinimized.value;
}

function closeTutorial() {
  boardingStore.closeManualAnnotationTutorial();
}

</script>
