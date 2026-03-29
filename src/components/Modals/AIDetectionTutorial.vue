<template>
  <div id="AIDetectionTutorialModal" ref="explanationBox" class="explanation" v-if="boardingStore.aiDetectionTutorialOn">
    <div class="top-bar">
      <p class="bold">{{ $t('aiDetectionTutorial.title') }}</p>
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
      <div>{{ $t('aiDetectionTutorial.step' + boardingStore.aiDetectionCurrentStep) }}</div>
    </div>
    <div v-if="!isMinimized" class="controls">
      <button
        id="AIDetectionTutorialBackButton"
        class="btn btn-outlined step-btn"
        @click="prevStep"
        :disabled="boardingStore.aiDetectionCurrentStep === 1"
      >{{ $t('general.backButton') }}</button>
      <p class="steps">{{ boardingStore.aiDetectionCurrentStep }} {{ $t('aiDetectionTutorial.steps') }}</p>
      <button
        id="AIDetectionTutorialNextButton"
        class="btn btn-filled step-btn"
        @click="nextStep"
      >{{ nextButtonText }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useBoardingStore } from '@/stores/BoardingStore';
import { useI18n } from 'vue-i18n';

const boardingStore = useBoardingStore();
const { t } = useI18n();

const isMinimized = ref(false);

const nextButtonText = computed(() =>
  boardingStore.aiDetectionCurrentStep === 6 ? t('general.finishButton') : t('general.nextButton')
);

function nextStep() {
  boardingStore.setAiDetectionCurrentStep(boardingStore.aiDetectionCurrentStep + 1);
}

function prevStep() {
  boardingStore.setAiDetectionCurrentStep(boardingStore.aiDetectionCurrentStep - 1);
}

function toggleMinimize() {
  isMinimized.value = !isMinimized.value;
}

function closeTutorial() {
  boardingStore.setAiDetectionTutorialOff();
}
</script>
