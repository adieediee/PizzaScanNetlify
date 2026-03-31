<template>
  <div id="DefectExamplesModal" v-if="modalStore.isModalOpen('defectExamples')" class="modal">
    <div class="modal-content modal-content--narrow">
      <div class="modal-title">
        <h1>{{ $t('modals.defectExamples.title') }}</h1>
        <button @click="modalStore.closeModal()" class="btn btn-close">
          <fa :icon="['fas', 'xmark']" />
        </button>
      </div>
      <div class="modal-body">
        <p class="subtitle">{{ $t('modals.defectExamples.subtitle') }}</p>
        <div class="cards-grid">
          <div v-for="item in defectItems" :key="item.value" class="defect-card">
            <div class="card-image-wrapper">
              <img :src="item.image" :alt="item.name" class="card-image" />
            </div>
            <div class="card-footer">
              <span class="defect-dot" :style="{ background: item.color }"></span>
              <span class="defect-name">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useModalStore } from '@/stores/ModalStore';

import imgNormal from '@/assets/images/pizza-normal.png';
import imgNoSalamiCenter from '@/assets/images/pizza-no_salami_center.png';
import imgOneSalamiCenter from '@/assets/images/pizza-one_salami_center.png';
import imgTooManySalamy from '@/assets/images/pizza-too_many_salamy.png';
import imgTooManySlices from '@/assets/images/to_many_slices.png';

const modalStore = useModalStore();

const defectItems = [
  { value: 'normal',                name: 'Normal',                 color: '#95F204', image: imgNormal },
  { value: 'missing-center-salami', name: 'Missing center salami',  color: '#D9001B', image: imgNoSalamiCenter },
  { value: 'one-center-salami',     name: 'Only one center salami', color: '#FF6B35', image: imgOneSalamiCenter },
  { value: 'extra-salami',          name: 'Extra salami',           color: '#a11cff', image: imgTooManySalamy },
  { value: 'wrong-slices',          name: 'Wrong slice count',      color: '#FFA03B', image: imgTooManySlices },
];
</script>

<style scoped>
.modal-content--narrow {
  width: fit-content;
  min-width: 400px;
  max-width: 780px;
}

.modal-body {
  flex-direction: column;
}

.subtitle {
  color: #aaaacc;
  font-size: 0.9rem;
  margin-bottom: 24px;
  width: 100%;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  width: 100%;
}

.defect-card {
  background: #1a1a2e;
  border: 1px solid #2D2D42;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s;
}

.defect-card:hover {
  border-color: #3E63DD66;
}

.card-image-wrapper {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #12121e;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
}

.defect-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.defect-name {
  font-size: 0.85rem;
  color: #e0e0f0;
  font-weight: 500;
}
</style>
