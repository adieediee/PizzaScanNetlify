<template>
  <div id="AnnotationProfile" class="section">

    <!-- Cropped image with type badge overlay -->
    <div class="profile-image-wrapper">
      <img class="cutout" :src="imageStore.croppedImage" alt="Label preview" />
      <span class="type-badge" :class="isAI ? 'badge-ai' : 'badge-manual'">
        {{ isAI ? 'AI' : 'Manual' }}
      </span>
    </div>

    <!-- Label info row: defect color dot + actions -->
    <div class="profile-row">
      <div
        id="AnnotationProfileDot"
        :style="{ backgroundColor: imageStore.selectedAnnotation.color }"
        :class="{
          'annotation-dot': !isAI,
          'annotation-square': isAI,
        }"
      ></div>
      <div class="profile-actions">
        <button id="zoomToAnnotationButton" class="btn btn-icon" @click="zoomAnnotation">
          <fa :icon="['fas', 'magnifying-glass-plus']" />
          <span class="tooltip tooltip-section long-tooltip">{{ $t('annotation.zoomTo') }}</span>
        </button>
        <button id="deleteAnnotationButton" class="btn btn-icon deleteButton" @click="deleteAnnotation">
          <fa :icon="['far', 'trash-can']" />
          <span class="tooltip tooltip-section long-tooltip">{{ $t('annotation.delete') }}</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useImageStore } from '@/stores/ImageStore';

const emit = defineEmits(['annotationDeleted', 'zoomToAnnotation']);

const imageStore = useImageStore();
const annotationStore = useAnnotationStore();

const isAI = computed(() => imageStore.selectedAnnotation?.type === 'AI');

const deleteAnnotation = () => {
  annotationStore.deleteAnnotation(imageStore.selectedAnnotation);
  imageStore.setSelectedAnnotation(null);
  emit('annotationDeleted');
};

const zoomAnnotation = () => {
  emit('zoomToAnnotation', imageStore.selectedAnnotation);
};
</script>

<style scoped>
.profile-image-wrapper {
  position: relative;
  width: 100%;
  margin-bottom: 10px;
}

.cutout {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}

.type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 6px;
}

.badge-ai {
  background: rgba(62, 99, 221, 0.85);
  color: #fff;
}

.badge-manual {
  background: rgba(45, 45, 66, 0.85);
  color: rgba(235, 235, 235, 0.8);
}

.profile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-actions {
  display: flex;
  gap: 4px;
}
</style>
