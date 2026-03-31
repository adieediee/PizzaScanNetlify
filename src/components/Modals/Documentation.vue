<template>
    <div id="DocumentationModal" v-if="modalStore.isModalOpen('documentation')" class="modal">
      <div class="modal-content">
        <div class="modal-title">
          <h1>{{$t('modals.documentation.title')}}</h1>
          <button id="closeDocumentationModalButton" @click="modalStore.closeModal()" class="btn btn-close">
            <fa :icon="['fas', 'xmark']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="modal-nav">
            <button id="DocumentationSection" @click="showSection('about')" :class="{ active: currentSection === 'about' }">{{$t('modals.documentation.about.title')}}</button>
            <button id="LayoutSection" @click="showSection('layout')" :class="{ active: currentSection === 'layout' }">{{$t('modals.documentation.layout.title')}}</button>
            <button id="ManualTutorialSection" @click="showSection('manual')" :class="{ active: currentSection === 'manual' }">{{$t('modals.documentation.manualTutorial.title')}}</button>
            <button id="AIAnnotationSection" @click="showSection('aiAnnotation')" :class="{ active: currentSection === 'aiAnnotation' }">{{$t('modals.documentation.aiAnnotation.title')}}</button>
            <button id="AIDetectionSection" @click="showSection('aiDetection')" :class="{ active: currentSection === 'aiDetection' }">{{$t('modals.documentation.aiDetection.title')}}</button>
            <button id="ShortcutsSection" @click="showSection('shortcuts')" :class="{ active: currentSection === 'shortcuts' }">{{$t('modals.documentation.shortcuts.title')}}</button>
          </div>
          <div class="modal-doc">
            <div v-if="currentSection === 'about'"><About /></div>
            <div v-if="currentSection === 'layout'"><Layout /></div>
            <div v-if="currentSection === 'manual'"><ManualAnnotation /></div>
            <div v-if="currentSection === 'aiAnnotation'"><AIAnnotationDoc /></div>
            <div v-if="currentSection === 'aiDetection'"><AIDetectionDoc /></div>
            <div v-if="currentSection === 'shortcuts'"><Shortcuts /></div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup>
  import { ref } from 'vue';
  import { useModalStore } from '@/stores/ModalStore';
  import About from '@/components/Modals/DocumentationPages/About.vue';
  import Layout from './DocumentationPages/Layout.vue';
  import ManualAnnotation from './DocumentationPages/ManualAnnotation.vue';
  import AIAnnotationDoc from './DocumentationPages/AIAnnotationDoc.vue';
  import AIDetectionDoc from './DocumentationPages/AIDetectionDoc.vue';
  import Shortcuts from './DocumentationPages/Shortcuts.vue';

  const modalStore = useModalStore();
  const currentSection = ref('about');

  const showSection = (section) => {
    currentSection.value = section;
  };
</script>
