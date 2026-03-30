<template>
  <div class="ai-summary section" v-if="aiAnnotations.length > 0">
    <div class="ai-summary-header">
      <span class="ai-summary-title">AI Labels</span>
      <span class="ai-summary-count">{{ aiAnnotations.length }}</span>
    </div>

    <div class="ai-summary-rows">
      <div class="ai-summary-row" v-if="inspectionCount > 0">
        <span class="ai-summary-dot" style="background: #E05C3A"></span>
        <span class="ai-summary-label">May need correction</span>
        <span class="ai-summary-num">{{ inspectionCount }}</span>
      </div>
      <div class="ai-summary-row" v-if="reviewCount > 0">
        <span class="ai-summary-dot" style="background: #D4920A"></span>
        <span class="ai-summary-label">Needs check</span>
        <span class="ai-summary-num">{{ reviewCount }}</span>
      </div>
      <div class="ai-summary-row" v-if="confidentCount > 0">
        <span class="ai-summary-dot" style="background: #4CAF50"></span>
        <span class="ai-summary-label">Likely correct</span>
        <span class="ai-summary-num">{{ confidentCount }}</span>
      </div>
    </div>

    <div class="ai-summary-actions">
      <button class="btn ai-summary-btn ai-summary-btn-accept" @click="acceptAll">
        <fa :icon="['fas', 'check']" />
        Accept all
      </button>
      <button class="btn ai-summary-btn ai-summary-btn-delete" @click="deleteAll">
        <fa :icon="['far', 'trash-can']" />
        Delete all
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useCanvasStore } from '@/stores/CanvasStore';
import { useImageStore } from '@/stores/ImageStore';
import { useModalStore } from '@/stores/ModalStore';

const annotationStore = useAnnotationStore();
const canvasStore = useCanvasStore();
const imageStore = useImageStore();
const modalStore = useModalStore();

const normalizeConfidence = (c) => {
  if (!Number.isFinite(c)) return null;
  const pct = c <= 1 ? c * 100 : c;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

const aiAnnotations = computed(() => {
  if (!canvasStore.selectedImage) return [];
  return annotationStore.annotations.filter(
    (a) => a.imageId === canvasStore.selectedImage.imageId && a.type === 'AI'
  );
});

const inspectionCount = computed(() =>
  aiAnnotations.value.filter((a) => {
    const p = normalizeConfidence(a.confidence);
    return p !== null && p < 50;
  }).length
);

const reviewCount = computed(() =>
  aiAnnotations.value.filter((a) => {
    const p = normalizeConfidence(a.confidence);
    return p !== null && p >= 50 && p < 80;
  }).length
);

const confidentCount = computed(() =>
  aiAnnotations.value.filter((a) => {
    const p = normalizeConfidence(a.confidence);
    return p !== null && p >= 80;
  }).length
);

const acceptAll = () => {
  annotationStore.acceptAllAIAnnotations(canvasStore.selectedImage.imageId);
};

const deleteAll = () => {
  imageStore.setRightClickedImage(canvasStore.selectedImage);
  modalStore.openModal('AiDeletion');
};
</script>

<style scoped>
.ai-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-summary-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a7aaa;
}

.ai-summary-count {
  font-size: 0.75rem;
  font-weight: 700;
  background: #222238;
  color: #a0a0c0;
  padding: 2px 8px;
  border-radius: 10px;
}

.ai-summary-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ai-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 7px;
  background: #16162a;
}

.ai-summary-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ai-summary-label {
  font-size: 0.8rem;
  color: #c0c0e0;
  flex: 1;
}

.ai-summary-num {
  font-size: 0.8rem;
  font-weight: 700;
  color: #7a7aaa;
}

.ai-summary-actions {
  display: flex;
  gap: 6px;
}

.ai-summary-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.ai-summary-btn-accept {
  background: #1a3a1a;
  color: #4CAF50;
}

.ai-summary-btn-accept:hover {
  background: #1e4a1e;
  color: #6fcf72;
}

.ai-summary-btn-delete {
  background: #2a1a1a;
  color: #E05C3A;
}

.ai-summary-btn-delete:hover {
  background: #3a1a1a;
  color: #f07050;
}
</style>
