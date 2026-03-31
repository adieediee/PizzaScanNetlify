<template>
  <div id="AnnotationParameters" class="section">

    <!-- AI Assessment card — only for AI labels -->
    <template v-if="isAIAnnotation && explainability">
      <div class="ai-card" :class="cardClass">

        <!-- Header: title left, pill right -->
        <div class="ai-card-header">
          <span class="ai-card-title">AI Assessment</span>
          <span class="confidence-pill" :class="confidenceClass">{{ confidenceLabel }}</span>
        </div>

        <!-- Action hint — directly under confidence tag -->
        <p class="action-hint">{{ actionHint }}</p>

        <div class="ai-divider"></div>

        <!-- Reasoning — main LLM explanation -->
        <p class="reasoning-text">{{ explainability.reasoning }}</p>

        <div class="ai-divider"></div>

        <!-- Alternative — least important -->
        <div class="alternative-block">
          <span class="alternative-heading">Could also be</span>
          <div class="alternative-row">
            <span class="alternative-dot" :style="{ background: alternativeColor }"></span>
            <span class="alternative-name">{{ explainability.alternativeName }}</span>
          </div>
        </div>

      </div>
    </template>

    <!-- Notes — for all labels -->
    <div class="title-chevron">
      <h3>{{ $t('rightSidebar.AnnotationOverview.parametersDescription') }}</h3>
      <button class="btn chevron-btn" @click="toggleDescription" :class="{ rotated: showDescription }">
        <fa :icon="['fas', 'chevron-down']" />
      </button>
    </div>
    <textarea
      v-if="showDescription"
      id="parametresDescriptionInput"
      :placeholder="$t('rightSidebar.AnnotationOverview.parametersDescriptionPlaceholder')"
      :value="imageStore.selectedAnnotation.description"
      @input="updateAnnotationDescription($event.target.value)"
    />

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useImageStore } from '@/stores/ImageStore';
import explainabilityData from '@/actions/aiExplainability.json';

const imageStore = useImageStore();
const annotationStore = useAnnotationStore();
const showDescription = ref(true);

const toggleDescription = () => {
  showDescription.value = !showDescription.value;
};

const updateAnnotationDescription = (description) => {
  annotationStore.updateAnnotationDescription(imageStore.selectedAnnotation.id, description);
};

const isAIAnnotation = computed(() => imageStore.selectedAnnotation?.type === 'AI');

const explainability = computed(() => {
  const val = imageStore.selectedAnnotation?.microtubularDefectValue;
  return explainabilityData[val] || null;
});

const normalizeConfidence = (c) => {
  if (!Number.isFinite(c)) return null;
  const pct = c <= 1 ? c * 100 : c;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

const confidencePct = computed(() =>
  normalizeConfidence(imageStore.selectedAnnotation?.confidence) ?? 0
);

const confidenceClass = computed(() => {
  if (confidencePct.value >= 80) return 'label-confident';
  if (confidencePct.value >= 50) return 'label-check';
  return 'label-correction';
});

const cardClass = computed(() => {
  if (confidencePct.value >= 80) return 'card-confident';
  if (confidencePct.value >= 50) return 'card-check';
  return 'card-correction';
});

const confidenceLabel = computed(() => {
  if (confidencePct.value >= 80) return 'Likely correct';
  if (confidencePct.value >= 50) return 'Needs check';
  return 'May need correction';
});

const actionHint = computed(() => {
  if (confidencePct.value >= 80) return 'This label looks good — you can still edit it if needed.';
  if (confidencePct.value >= 50) return 'Quickly verify this label before accepting.';
  return 'Review this label carefully before accepting.';
});

const alternativeColor = computed(() => {
  const alt = explainability.value?.alternative;
  return annotationStore.microtubularDefects.find(d => d.value === alt)?.color || '#888';
});
</script>

<style scoped>
/* AI Assessment card */
.ai-card {
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-left: 3px solid transparent;
}

.card-confident  { background: #0e1f0e; border-left-color: #4CAF50; }
.card-check      { background: #1f160a; border-left-color: #D4920A; }
.card-correction { background: #1f0e0a; border-left-color: #E05C3A; }

.ai-card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.ai-card-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #7a7aaa;
}

.confidence-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 20px;
}

.label-confident  { color: #4CAF50; background: #4caf5030; }
.label-check      { color: #D4920A; background: #d4920a30; }
.label-correction { color: #E05C3A; background: #e05c3a30; }

.reasoning-text {
  font-size: 0.82rem;
  font-weight: 500;
  color: rgba(235, 235, 235, 0.88);
  line-height: 1.65;
  margin: 0;
}

.ai-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

.action-hint {
  font-size: 0.72rem;
  font-weight: 400;
  color: rgba(235, 235, 235, 0.4);
  line-height: 1.5;
  margin: 0;
}

/* Alternative */
.alternative-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.alternative-heading {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a7aaa;
}

.alternative-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 10px;
  border-radius: 6px;
}

.alternative-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alternative-name {
  font-size: 0.8rem;
  color: rgba(235, 235, 235, 0.7);
}

/* Notes textarea */
textarea {
  margin: 10px 0 20px 0;
  width: 100%;
}
</style>
