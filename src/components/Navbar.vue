<template>
  <nav id="navigation" class="navbar" :style="{ zIndex: boardingStore.explainNav ? 10 : 1 }">
    <div class="navbar-left">
       <img :src="Logo" alt="logo" class="logo" />
    </div>
    <div class="navbar-middle">
      <div style="position: relative;">
        <button
          id="automatic-annotation-button"
          class="btn ai-filter-btn"
          data-button="AI-button"
          @click.stop="handleAiButtonClick"
          :disabled="!boardingStore.wholeTutorialSeen"
          :class="{ 'highlighted': boardingStore.currentStep === 2 }">
          AI
          <template v-if="hasAIAnnotations">
            <span
              v-for="dot in aiFilterDots"
              :key="dot.color"
              class="ai-filter-dot"
              :style="{ backgroundColor: dot.color }"
            ></span>
            <span class="ai-filter-chevron">&#8964;</span>
          </template>
        </button>
        <div v-show="aiFilterOpen" class="ai-filter-dropdown" ref="aiFilterModal" @click.stop>
          <div
            class="ai-filter-item"
            :style="aiFilterItemStyle('#E05C3A', canvasStore.aiVisibilityFilter.showInspection)"
            @click="canvasStore.aiVisibilityFilter.showInspection = !canvasStore.aiVisibilityFilter.showInspection">
            Needs Inspection
          </div>
          <div
            class="ai-filter-item"
            :style="aiFilterItemStyle('#D4920A', canvasStore.aiVisibilityFilter.showReview)"
            @click="canvasStore.aiVisibilityFilter.showReview = !canvasStore.aiVisibilityFilter.showReview">
            Needs Review
          </div>
          <div
            class="ai-filter-item"
            :style="aiFilterItemStyle('#4CAF50', canvasStore.aiVisibilityFilter.showConfident)"
            @click="canvasStore.aiVisibilityFilter.showConfident = !canvasStore.aiVisibilityFilter.showConfident">
            AI is confident
          </div>
        </div>
        <ExplanationComponent
          v-if="boardingStore.currentStep === 1"
          :text="$t('layoutTutorial.step1')"
        />
        <ExplanationComponent
          v-if="boardingStore.currentStep === 2"
          :text="$t('layoutTutorial.step2')"
        />
      </div>
      <div>
        <button
          id="ai-detection-button"
          class="btn btn-icon btn-ai-detection"
          @click="aiDetection"
          :disabled="!boardingStore.wholeTutorialSeen || !canvasStore.selectedImage">
            AI Detection
            <span v-if="!boardingStore.explainNav" class="tooltip">Run AI pizza detection</span>
        </button>
      </div>

      <div class="tools-for-image">
        <div>
          <button 
            id="center-image-button"
            class="btn btn-icon" 
            data-button="centerImageButton" 
            @click="centerImage"
            :disabled="!boardingStore.wholeTutorialSeen"
            :class="{ 'highlighted': boardingStore.currentStep === 3 }">
              <fa :icon="['fas', 'expand']" />
              <span v-if="!boardingStore.explainNav" class="tooltip">
                {{$t('navigation.tooltips.centerImage')}}
                <span class="shortcut shortcut-tooltip">CTRL + I</span>
              </span>
          </button>
        </div>
        <div>
          <button 
            id="undo-button"
            class="btn btn-icon" 
            data-button="undoButton" 
            @click="undoLastStep" 
            :disabled="!boardingStore.wholeTutorialSeen || !canUndo"
            :class="{ 'highlighted': boardingStore.currentStep === 3 }">
              <fa :icon="['fas', 'rotate-left']" />
              <span v-if="!boardingStore.explainNav" class="tooltip">
                {{$t('navigation.tooltips.undo')}}
                <span class="shortcut shortcut-tooltip">CTRL + Z</span>
              </span>
          </button>
          <ExplanationComponent
            v-if="boardingStore.currentStep === 3"
            :text="$t('layoutTutorial.step3')"
          />
        </div>
      </div>
      
      <div>
        <button 
          id="mtds-tool-btn"
          data-button="microtubularDefectsButton" 
          class="btn" 
          @click="toggleMicrotubularDefects"
          :disabled="!boardingStore.wholeTutorialSeen"
          :class="{ 'highlighted': boardingStore.currentStep === 4 }">
          <span class="defect-name"
            :style="{ 
              color: selectedMicrotubularDefectColor, 
              backgroundColor: selectedMicrotubularDefectColor + '40'
            }">
            {{ selectedMicrotubularDefectName }}
          </span>
          <span v-if="!boardingStore.explainNav && !microtubularDefectsOpen" class="tooltip">{{$t('navigation.tooltips.chooseMicrotubularDefect')}}</span>
          <ul v-if="microtubularDefectsOpen" class="dropdown-content">
            <div class="scrollable-list">
              <li 
                v-for="tool in annotationStore.microtubularDefects" 
                :key="tool.value"
                :class="{ active: selectedTool === tool.value }"
                @click="setMicrotubularDefect(tool.value)">
                <span class="defect-name dafect-name-list" :style="{ color: tool.color, backgroundColor: tool.color + '40'}">
                  {{ tool.name }}
                </span>
                <span class="shortcut">{{ getShortcut(tool.value).value }}</span>
              </li>
            </div>
            <li class="add-new-class" @click="addNewClass">
              <fa :icon="['fas', 'circle-plus']" />
              {{$t('annotation.addNewClass')}}
              <span class="shortcut">CTRL + A</span>
            </li>
          </ul>
        </button>
      </div>

      <div>
        <button 
          id="opacity-button"
          class="btn btn-icon" 
          data-button="opacityButton" 
          @click="toggleOpacity($event)" 
          :disabled="!boardingStore.wholeTutorialSeen"
          :class="{ 'highlighted': boardingStore.currentStep === 4 }">
            <fa :icon="['fas', 'circle-half-stroke']" />
            <span v-if="!boardingStore.explainNav && !opacityOpen" class="tooltip">{{$t('navigation.tooltips.changeOpacity')}}</span>
            <div v-if="opacityOpen" class="opacity-modal" ref="opacityModal">
              <div class="opacity-input">
                <p>Opacity:</p>
                <input 
                  type="number" 
                  v-model="sliderValue" 
                  class="slider-value-input" 
                  min="0" 
                  max="100"
                  @input="updateOpacity(sliderValue)"
                  @click.stop
                />
              </div>
              <input 
                class="slider" 
                type="range" 
                id="slider" 
                min="0" 
                max="100" 
                v-model="sliderValue"
                @input="updateOpacity(sliderValue)"
              />
            </div>
        </button>
      </div>
      <div>
        <button 
          id="point-size-button"
          class="btn btn-icon" 
          data-button="pointSizeButton" 
          @click="togglePointSize($event)" 
          :disabled="!boardingStore.wholeTutorialSeen"
          :class="{ 'highlighted': boardingStore.currentStep === 4 }">
            <fa :icon="['fas', 'circle-dot']" />
            <span v-if="!boardingStore.explainNav && !pointSizeOpen" class="tooltip">{{$t('navigation.tooltips.changePointSize')}}</span>
            <div v-if="pointSizeOpen" class="opacity-modal" ref="pointSizeModal">
              <div class="opacity-input">
                <p>Point size:</p>
                <input 
                  type="number" 
                  v-model="pointValue" 
                  class="slider-value-input" 
                  min="5" 
                  max="25"
                  @input="updatePointSize(pointValue)"
                  @click.stop
                />
              </div>
              <input 
                class="slider" 
                type="range" 
                id="slider" 
                min="5" 
                max="25"
                @input="updatePointSize(pointValue)" 
                v-model="pointValue"
              />
            </div>
        </button>
        <ExplanationComponent
          v-if="boardingStore.currentStep === 4"
          :text="$t('layoutTutorial.step4')"
        />
      </div>
    </div>
    <div class="navbar-right">
      <div>
        <button
          id="open-project-button"
          class="btn btn-outlined" 
          data-button="openProjectButton" 
          @click="handleOpenProject"
          :disabled="!boardingStore.wholeTutorialSeen">
          {{$t('navigation.buttons.openProject')}}
        </button>
      </div>
      <div>
        <button
          id="save-button"
          class="btn btn-outlined" 
          @click="saveProject()"
          data-button="saveProjectButton"  
          :disabled="!boardingStore.wholeTutorialSeen">
          {{$t('navigation.buttons.save')}}
        </button>
      </div>
      <div>
        <button 
          id="export-button"
          class="btn btn-filled" 
          data-button="exportButton" 
          @click="openExportModal" 
          :disabled="!boardingStore.wholeTutorialSeen">

          {{$t('navigation.buttons.export')}}
        </button>
      </div>
      <div>
        <button 
          id="settings-button"
          class="btn btn-icon" 
          data-button="settingsButton"
          @click="openSettingsModal"
          :disabled="!boardingStore.wholeTutorialSeen">

            <fa :icon="['fas', 'gear']" />
            <span v-if="!boardingStore.explainNav" class="tooltip">{{$t('navigation.settings.settings')}}</span>
        </button>
      </div>
      <div>
        <button
          id="documentation-button"
          class="btn btn-icon" 
          data-button="documentationButton" 
          @click="toggleSettings" 
          :disabled="!boardingStore.wholeTutorialSeen">
            <fa :icon="['fas', 'circle-question']" />
            <span v-if="!boardingStore.explainNav && !settingsOpen" class="tooltip">{{$t('navigation.settings.documentation')}}</span>
            <ul v-if="settingsOpen" class="dropdown-content dropdown-settings">
              <li id="settings-documentation" @click="openDocumentationModal"> {{$t('navigation.settings.documentation')}} </li>
              <li id="settings-feedback" @click="openFeedbackModal">  {{$t('navigation.settings.userFeedback')}} </li>
            </ul>
        </button>
      </div>
    </div>
  </nav>

  <LoadingModal :isVisible="annotationStore.loading" @update:isVisible="annotationStore.loading = $event"/>
</template>

<script setup>
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, watch } from 'vue';
import { useCanvasStore } from '@/stores/CanvasStore';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useBoardingStore } from '@/stores/BoardingStore';
import { useModalStore } from '@/stores/ModalStore';
import { useLoggingStore } from '@/stores/LoggStore';
import { useShortcutStore } from '@/stores/ShortcutStore';
import { useImageStore } from "@/stores/ImageStore";
import { useStatisticStore } from "@/stores/StatisticStore";
import LoadingModal from '@/components/Modals/LoadingModal.vue';
import ExplanationComponent from '@/components/Modals/ExplanationComponent.vue';
import Logo from '@/assets/logo.png';
import { createAutomaticAnnotationHandler, createAIDetectionHandler } from '@/actions/automaticAnnotationAction';

const canvasStore = useCanvasStore();
const annotationStore = useAnnotationStore();
const boardingStore = useBoardingStore();
const modalStore = useModalStore();
const loggingStore = useLoggingStore();
const shortcutStore = useShortcutStore();
const imageStore = useImageStore();
const statisticStore = useStatisticStore();

const settingsOpen = ref(false);
const opacityOpen = ref(false);
const pointSizeOpen = ref(false);
const aiFilterOpen = ref(false);
const sliderValue = ref(canvasStore.currentOpacity);
const pointValue = ref(canvasStore.currentSize);
const opacityModal = ref(null);
const pointSizeModal = ref(null);
const aiFilterModal = ref(null);
const microtubularDefectsOpen = ref(false);
const selectedTool = ref('normal');

const hasAIAnnotations = computed(() =>
  annotationStore.annotations.some((a) => a.type === 'AI')
);

const handleAiButtonClick = () => {
  if (hasAIAnnotations.value) {
    aiFilterOpen.value = !aiFilterOpen.value;
    opacityOpen.value = false;
    pointSizeOpen.value = false;
  } else {
    automaticAnnotation();
  }
};

const aiFilterDots = computed(() => {
  const dots = [];
  if (canvasStore.aiVisibilityFilter.showInspection) dots.push({ color: '#E05C3A' });
  if (canvasStore.aiVisibilityFilter.showReview) dots.push({ color: '#D4920A' });
  if (canvasStore.aiVisibilityFilter.showConfident) dots.push({ color: '#4CAF50' });
  return dots;
});

const aiFilterItemStyle = (color, active) => ({
  color: active ? color : '#888',
  backgroundColor: active ? color + '33' : 'transparent',
  borderColor: active ? color : 'transparent',
});

const emit = defineEmits(['systemStatus']);

const automaticAnnotation = createAutomaticAnnotationHandler(boardingStore, annotationStore, canvasStore);
const aiDetection = createAIDetectionHandler(imageStore, canvasStore);

const centerImage = () => {
  canvasStore.centerImage();
};

const toggleMicrotubularDefects = () => {
  canvasStore.setActiveTool('annotation');
  microtubularDefectsOpen.value = !microtubularDefectsOpen.value;
};

const openExportModal = () => {
  modalStore.openModal('export')
};

const openSettingsModal = () => {
  modalStore.openModal('settings')
};

const toggleSettings = () => {
  settingsOpen.value = !settingsOpen.value;
};

const openDocumentationModal = () => {
  modalStore.openModal('documentation')
};

const openFeedbackModal = () => {
  modalStore.openModal('feedback')
};

const addNewClass = () => {
  modalStore.openModal('newClass')
};

const setMicrotubularDefect = (toolValue) => {
  const tool = annotationStore.microtubularDefects.find(t => t.value === toolValue);
  if (!tool) return;
  selectedTool.value = toolValue;
  microtubularDefectsOpen.value = false;
  canvasStore.setAnnotationColor(tool.color);
  canvasStore.setAnnotationType(toolValue);
  loggingStore.logEvent(`Microtubular defect selected: ${tool.name}, Time: ${new Date().toISOString()}`);
};

const toggleOpacity = (event) => {
  event.stopPropagation();
  opacityOpen.value = !opacityOpen.value;
  pointSizeOpen.value = false;
};

const togglePointSize = (event) => {
  event.stopPropagation();
  pointSizeOpen.value = !pointSizeOpen.value;
  opacityOpen.value = false;
};

const updateOpacity = (value) => {
  canvasStore.setOpacity(parseInt(value, 10));
};

const updatePointSize = (value) => {
  canvasStore.setSize(parseInt(value, 10));
};

const selectedMicrotubularDefectName = computed(() => {
  const tool = annotationStore.microtubularDefects.find(t => t.value === selectedTool.value);
  return tool ? tool.name : 'Select Tool';
});

const selectedMicrotubularDefectColor = computed(() => {
  const tool = annotationStore.microtubularDefects.find(t => t.value === selectedTool.value);
  return tool ? tool.color : 'black';
});

const undoLastStep = () => {
  annotationStore.undoLastAction();
  emit('systemStatus', 'undo');
};

onMounted(() => {
  document.addEventListener('click', (event) => {
    if (opacityOpen.value && opacityModal.value && !opacityModal.value.contains(event.target)) {
      opacityOpen.value = false;
    }
    if (pointSizeOpen.value && pointSizeModal.value && !pointSizeModal.value.contains(event.target)) {
      pointSizeOpen.value = false;
    }
    if (aiFilterOpen.value && aiFilterModal.value && !aiFilterModal.value.contains(event.target)) {
      aiFilterOpen.value = false;
    }
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('click', (event) => {});
});

onMounted(() => {
  const handleKeydown = (e) => {
     Object.keys(shortcutStore.getDefaultAndUserKeyBindings).forEach((defect) => {
       const key = shortcutStore.getKeyBinding(defect).value;
       if (e.key === key) {
         setMicrotubularDefect(defect);
       }
     });
  };

  window.addEventListener('keydown', handleKeydown);

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
});

const getShortcut = (defect) => {
  return computed(() => shortcutStore.getKeyBinding(defect).value === undefined ? '-' : shortcutStore.getKeyBinding(defect).value);
};

const canUndo = computed(() => annotationStore.annotationHistory.length > 1);

async function saveProject() {
  const zip = new JSZip();

  const projectData = {
    name: "PCD Diagnosis " + new Date().toISOString(),
    date: new Date().toISOString(),
    outcome: imageStore.projectOutcome,
    notes: imageStore.projectDescription,
    images: imageStore.uploadedImages,
    annotations: {
      annotations: annotationStore.annotations,
      microtubularDefects: annotationStore.microtubularDefects,
      dyneinArms: annotationStore.dyneinArms
    },
    statistics: {
      total: statisticStore.total,
      totalDA: statisticStore.totalDA,
      MTDs: statisticStore.MTDs,
      totalMTDs: statisticStore.totalMTDs,
      IDA: statisticStore.IDA,
      ODA: statisticStore.ODA,
      odaAida: statisticStore.odaAida,
      totalIDA: statisticStore.totalIDA,
      totalODA: statisticStore.totalODA
    }
  };

  zip.file("projectMetadata.json", JSON.stringify(projectData, null, 2));

  for (const img of imageStore.uploadedImages) {
    try {
      if (img.tiffVersion === 'TIFF' && img.rawTiffData) {
        zip.file(`images/${img.imageName}.tif`, img.rawTiffData);
      } else {
        const response = await fetch(img.imageUrl);
        const imgBlob = await response.blob();
        zip.file(`images/${img.imageName}.png`, imgBlob);
      }
    } catch (error) {
      console.error(`Failed to fetch image ${img.imageName}:`, error);
    }
  }

  zip.generateAsync({ type: "blob" }).then((zipBlob) => {
    saveAs(zipBlob, `PCD_Diagnosis_${new Date().toISOString()}.zip`);
  });

  emit('systemStatus', 'save');
};

const handleOpenProject = () => {
    const inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.accept = ".zip";
    inputElement.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        openProject(file);
      }
    };
    inputElement.click();
};

async function openProject(file) {
  if(canvasStore.selectedImage) {
    canvasStore.setImage(null);
    imageStore.setSelectedAnnotation(null);
    imageStore.setCopiedAnnotation(null); 
    imageStore.updateActiveTab('Project');
  }

  try {
    const zip = await JSZip.loadAsync(file);
    
    const metadataFile = await zip.file("projectMetadata.json").async("string");
    const projectData = JSON.parse(metadataFile);

    imageStore.projectOutcome = projectData.outcome || "";
    imageStore.projectDescription = projectData.notes || "";
    
    annotationStore.annotations = projectData.annotations.annotations || [];
    annotationStore.microtubularDefects = projectData.annotations.microtubularDefects || [
      { name: 'Normal', value: 'normal', color: '#95F204', count: 0, description: ""},
      { name: 'Disarranged', value: 'disarranged', color: '#D9001B', count: 0, description: ""},
      { name: 'Extra tubule', value: 'extra-tuble', color: '#a11cff', count: 0, description: ""},
      { name: 'Single tubule', value: 'single-tuble', color: '#00FFFF', count: 0, description: ""},
      { name: 'Compound', value: 'compound', color: '#FF7ED5', count: 0, description: ""},
      { name: 'Transposition', value: 'transposition', color: '#FFFF00', count: 0, description: ""},
      { name: 'One of central pair missing', value: 'one-of-pair-missing', color: '#FFA03B', count: 0, description: ""},
      { name: 'Both missing', value: 'both-missing', color: '#0000FF', count: 0, description: ""},
      { name: 'Other defect', value: 'other-defect', color: '#8B4513', count: 0, description: ""},
    ];
    annotationStore.dyneinArms = projectData.annotations.dyneinArms || [
      { name: 'Unknown', value: 'unknown', count: 0},
      { name: 'No arms missing', value: 'no-arms-missing', count: 0},
      { name: 'Inner arms missing', value: 'inner-arms-missing', count: 0},
      { name: 'Both arms missing', value: 'both-arms-missing', count: 0},
      { name: 'Outer arms missing', value: 'outer-arms-missing', count: 0},
    ];
    
    statisticStore.total = projectData.statistics.total || 0;
    statisticStore.totalDA = projectData.statistics.totalDA || 0;
    statisticStore.totalMTDs = projectData.statistics.totalMTDs || 0;
    statisticStore.odaAida = projectData.statistics.odaAida || 0;
    statisticStore.totalIDA = projectData.statistics.totalIDA || 0;
    statisticStore.totalODA = projectData.statistics.totalODA || 0;

    imageStore.uploadedImages = [];
    imageStore.uploadModalVisible = true;
    let filesProcessed = 0;
    let numberFiles = projectData.images.length;

    for (const img of projectData.images) {
      const imagePath = `images/${img.imageName}`;
      const imageFile = zip.file(imagePath) || zip.file(`${imagePath}.tif`) || zip.file(`${imagePath}.png`);

      if (imageFile) {
        const imageBlob = await imageFile.async("blob");

        if (img.tiffVersion === "TIFF") {
          const arrayBuffer = await imageBlob.arrayBuffer();
          const tiff = new Tiff({ buffer: arrayBuffer });
          const canvas = tiff.toCanvas();
          const imageUrl = canvas.toDataURL("image/png");

          imageStore.addImage({
            imageUrl: imageUrl,
            imageName: img.imageName,
            isOpen: false,
            onceOpen: false,
            reviewed: false,
            imageId: img.imageId,
            description: img.description,
            tiffVersion: "TIFF",
            rawTiffData: arrayBuffer,
          });
        } else {
          const imageUrl = URL.createObjectURL(imageBlob);

          imageStore.addImage({
            imageUrl: imageUrl,
            imageName: img.imageName,
            isOpen: false,
            onceOpen: false,
            reviewed: false,
            imageId: img.imageId,
            description: img.description,
          });
        }

        filesProcessed++;
        imageStore.currentPercentageUpload = (filesProcessed / numberFiles) * 100;
      }
    }

    const interval = setInterval(() => {
    if (filesProcessed === numberFiles) {
      clearInterval(interval);
      imageStore.uploadModalVisible = false;
      emit('systemStatus', 'open');
      }
    }, 100);

    emit('systemStatus', 'open');
  } catch (error) {
    emit('systemStatus', 'openError');
  }
};

watch(() => annotationStore.microtubularDefects, (newDefects) => {
  if (newDefects.length > 0) {
    const firstDefect = newDefects[0];
    selectedTool.value = firstDefect.value;
    canvasStore.setAnnotationColor(firstDefect.color);
    canvasStore.setAnnotationType(firstDefect.value);
  }
}, { immediate: true });

defineExpose({
  handleOpenProject,
  saveProject
});

</script>

<style>
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 5%;
    position: fixed;
    top: 0;
    left: 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 18px 21px 18px 15px;
    flex-shrink: 0;
    border-top: 1px solid var(--dark-dark3, #2D2D42);
    border-bottom: 1px solid var(--dark-dark3, #2D2D42);
    background: var(--dark-dark1, #101021);
  }
  
  .navbar-left,
  .navbar-right,
  .navbar-middle {
    display: flex;
    align-items: center;
  }

  .navbar-left {
    width: 15%;
  }

  .tools-for-image {
    display: flex;
    align-items: center;
    border-left: #2D2D42 solid 1px;
    border-right: #2D2D42 solid 1px;
  }
  
  .dropdown-content, .opacity-modal {
    position: fixed;
    top: 100%;
    left: 0;
    box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
    z-index: 1;
    padding: 5px;
    margin: 0;
    list-style-type: none;
    background: var(--dark-dark1, #101021);
    color: white;
    border-radius: 0 0 15px 15px;
  }
  
  .dropdown-content li {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 5px;
  }

  .dropdown-content li:hover {
    background: var(--dark-dark2, #202030);
  }
  
  .dropdown-content span {
    width: max-content;
  }

  .scrollable-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .scrollable-list::-webkit-scrollbar,
  .dropdown-content::-webkit-scrollbar {
    width: 5px;
  }

  .scrollable-list::-webkit-scrollbar-thumb,
  .dropdown-content::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .scrollable-list::-webkit-scrollbar-thumb:hover,
  .dropdown-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .opacity-modal {
    width: max-content;
    padding-inline: 5px;
  }

  .slider {
    width: 120px;
    padding: 0;
    margin: 0;
  }

  .slider-value-input {
    text-align: center;
    padding: 10px;
    width: 45%;
    margin: 10px 0;
  }

  .opacity-input {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .btn-ai:hover {
    background: var(--blue-blue2, #3E63DD);
    color: white!important;;
  }

  .btn-ai-detection {
    font-size: 0.75rem;
    font-weight: 600;
    color: #95F204;
    border: 1px solid #95F20466;
    white-space: nowrap;
  }

  .btn-ai-detection:hover:not(:disabled) {
    background: #95F204;
    color: #111;
  }

  .btn-ai-detection:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .activeTool {
    background: var(--blue-blue2, #3E63DD);
  }

  .dropdown-settings {
    right: 0;
    left: auto;
    width: max-content;
  }

  .dropdown-settings li {
    cursor: pointer;
  }

  .logo {
    width: 30%;
  }

  .add-new-class {
    gap: 8px;
    margin: 5px;
    border-top: #2D2D42 solid 1px;
  }

  .dafect-name-list {
    margin-right: 10px;
  }

  .shortcut {
    font-family: monospace;
    margin-left: auto;
    background: #212134;
    color: #737379;
    padding: 5px;
    border-radius: 15px;
  }

  .shortcut-tooltip {
    margin-left: 5px;
    font-size: smaller;
  }

  .ai-filter-wrapper {
    position: relative;
  }

  .ai-filter-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 1.5px solid #3E63DD;
    border-radius: 20px;
    padding: 5px 10px;
    font-weight: 600;
    white-space: nowrap;
    width: 110px;
  }

  .ai-filter-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .ai-filter-chevron {
    font-size: 14px;
    line-height: 1;
    color: #888;
  }

  .ai-filter-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background: var(--dark-dark1, #101021);
    border: 1px solid #2D2D42;
    border-radius: 0 0 15px 15px;
    box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
    z-index: 100;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 170px;
  }

  .ai-filter-item {
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    border: 1.5px solid transparent;
    transition: background 0.15s, color 0.15s;
  }

  .ai-filter-item:hover {
    filter: brightness(1.2);
  }

</style>
