<template>
  <aside id="rightSidebar" class="right-sidebar" >
    <div class="tabs">
      <button 
        id="ProjectTab"
        class="tab-button"
        :class="[{ active: imageStore.activeTab === 'Project' }]"
        @click="setActiveTab('Project')"
      >
        {{$t('rightSidebar.ProjectOverview.title')}}
      </button>
      <button 
        id="ImageTab"
        class="tab-button middle-tab"
        :class="[{ active: imageStore.activeTab === 'Image'}]"
        @click="setActiveTab('Image')"
      >
        {{$t('rightSidebar.ImageOverview.title')}}
      </button>
      <button
        id="AnnotationTab" 
        class="tab-button"
        :class="[{ active: imageStore.activeTab === 'Annotation'}]"
        @click="setActiveTab('Annotation')"
      >
        {{$t('rightSidebar.AnnotationOverview.title')}}
      </button>
    </div>

    <div v-if="imageStore.activeTab === 'Project'">
      <ProjectOverview />
    </div> 
    <div v-if="imageStore.activeTab === 'Image'">
      <p
        v-if="canvasStore.selectedImage === null"
        class="nonSelected"
        >
        {{$t('rightSidebar.ImageOverview.text')}}
      </p>
      <ImageOverview v-else/>
    </div> 
    <div v-if="imageStore.activeTab === 'Annotation'">
      <p 
        v-if="canvasStore.selectedImage === null || imageStore.selectedAnnotation === null"
        class="nonSelected"
        >
        {{$t('rightSidebar.AnnotationOverview.text')}}
      </p>
      <AnnotationOverview 
        v-else
        @annotationDeleted="handleAnnotationDeleted"
        @annotationUpdated="updateSelectedAnnotation"
        @zoomToAnnotation="forwardZoomToAnnotation"
      />
    </div>  

    <ExplanationComponent
      v-if="boardingStore.showLayoutTutorial && boardingStore.explainRightBar"
      :text="explanationText"
    />
  </aside>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ProjectOverview from './RightsideSections/Project overview/ProjectOverview.vue';
import AnnotationOverview from './RightsideSections/Annotation overview/AnnotationOverview.vue';
import ImageOverview from './RightsideSections/Image overview/ImageOverview.vue';
import ExplanationComponent from './Modals/ExplanationComponent.vue';

import { useCanvasStore } from '@/stores/CanvasStore';
import { useImageStore } from '@/stores/ImageStore';
import { useBoardingStore } from '@/stores/BoardingStore';
import { useContextMenu } from '@/stores/ContextMenuStore';

const { t } = useI18n();

const contextStore = useContextMenu();
const canvasStore = useCanvasStore();
const imageStore = useImageStore();
const boardingStore = useBoardingStore();

const emit = defineEmits(['annotationUpdated', 'zoomToAnnotation']);

const setActiveTab = (tab) => {
  imageStore.updateActiveTab(tab);
  contextStore.closeAllMenus();
};

const handleAnnotationDeleted = () => {
  if (imageStore.activeTab === 'Annotation') {
    imageStore.updateActiveTab('Image');
    contextStore.closeAllMenus();
  }
};

const updateSelectedAnnotation = (annotation) => {
  emit('annotationUpdated', annotation);
};

const forwardZoomToAnnotation = (annotation) => {
  emit('zoomToAnnotation', annotation);
};

const explanationText = computed(() => {
  return boardingStore.currentStep === 7 ? t('layoutTutorial.step7') : null;
});

watch(() => imageStore.selectedAnnotation, (newAnnotation) => {
  if (newAnnotation === null) {
    handleAnnotationDeleted();
  }
});
</script>
  
<style scoped>
  .tabs {
    display: flex;
    justify-content: space-around;
    background: var(--dark-dark3, #2D2D42);
  }
  
  .tab-button {
    background: none;
    border: none;
    padding: 10px;
    cursor: pointer;
    font-weight: 600;
    color: white;
    width: 100%;
  }
    
  .tab-button.active {
    background: #3E63DD;
  }
  
  .tab-button.disabled {
    color: #707070;
    cursor: not-allowed;
  }

  .middle-tab {
    border-left: 1px solid var(--dark-dark1, #101021);
    border-right: 1px solid var(--dark-dark1, #101021);
  }

  .explanation {
    left: 60%;
  }

  .nonSelected {
    text-align: center;  
    color: var(--dark-dark3, #74748b);
    padding: 20px;
  }

  @media (max-width: 1024px) {
    .tab-button {
      font-size: 0.6rem;
      padding: 10px;
    }
  }
</style>  