<template>
  <nav id="navigation" class="navbar" :style="{ zIndex: boardingStore.explainNav ? 10 : 1 }">
    <div class="navbar-left">
       <img :src="Logo" alt="logo" class="logo" />
    </div>
    <div class="navbar-middle">
      <div class="toolbar-pill">

        <!-- AI filter button -->
        <div class="toolbar-item" style="position: relative;">
          <button
            id="automatic-annotation-button"
            class="btn tb-btn tb-btn-ai"
            data-button="AI-button"
            @click.stop="handleAiButtonClick"
            :disabled="!boardingStore.wholeTutorialSeen"
            :class="{ 'highlighted': boardingStore.currentStep === 2, 'tb-btn-active': aiFilterOpen }">
            <span class="tb-ai-label">AI</span>
            <template v-if="hasAIAnnotations">
              <span
                v-for="dot in aiFilterDots"
                :key="dot.color"
                class="ai-filter-dot"
                :style="{ backgroundColor: dot.color }"
              ></span>
              <fa :icon="['fas', 'chevron-down']" class="tb-chevron" :class="{ 'tb-chevron-up': aiFilterOpen }" />
            </template>
          </button>
          <div v-show="aiFilterOpen" class="ai-filter-dropdown" ref="aiFilterModal" @click.stop>
            <div
              class="ai-filter-item"
              :style="aiFilterItemStyle('#E05C3A', canvasStore.aiVisibilityFilter.showInspection)"
              @click="canvasStore.aiVisibilityFilter.showInspection = !canvasStore.aiVisibilityFilter.showInspection">
              <span class="ai-filter-check">{{ canvasStore.aiVisibilityFilter.showInspection ? '✓' : '' }}</span>
              Needs Inspection
            </div>
            <div
              class="ai-filter-item"
              :style="aiFilterItemStyle('#D4920A', canvasStore.aiVisibilityFilter.showReview)"
              @click="canvasStore.aiVisibilityFilter.showReview = !canvasStore.aiVisibilityFilter.showReview">
              <span class="ai-filter-check">{{ canvasStore.aiVisibilityFilter.showReview ? '✓' : '' }}</span>
              Needs Review
            </div>
            <div
              class="ai-filter-item"
              :style="aiFilterItemStyle('#4CAF50', canvasStore.aiVisibilityFilter.showConfident)"
              @click="canvasStore.aiVisibilityFilter.showConfident = !canvasStore.aiVisibilityFilter.showConfident">
              <span class="ai-filter-check">{{ canvasStore.aiVisibilityFilter.showConfident ? '✓' : '' }}</span>
              AI is confident
            </div>
          </div>
          <ExplanationComponent v-if="boardingStore.currentStep === 1" :text="$t('layoutTutorial.step1')" />
          <ExplanationComponent v-if="boardingStore.currentStep === 2" :text="$t('layoutTutorial.step2')" />
        </div>

        <!-- AI Detection -->
        <div class="toolbar-item">
          <button
            id="ai-detection-button"
            class="btn tb-btn tb-btn-detect"
            @click="aiDetection"
            :disabled="!boardingStore.wholeTutorialSeen || !canvasStore.selectedImage">
            <fa :icon="['fas', 'wand-magic-sparkles']" />
            <span class="tb-label">Detect</span>
      <div>
        <button
          id="automatic-annotation-button"
          class="btn btn-icon btn-ai"
          data-button="AI-button" 
          @click="automaticAnnotation"
          :disabled="!boardingStore.wholeTutorialSeen"
          :class="{ 'highlighted': boardingStore.currentStep === 2 }">
            AI
            <span v-if="!boardingStore.explainNav" class="tooltip">{{$t('navigation.tooltips.ai')}}</span>
        </button>
        <ExplanationComponent
          v-if="boardingStore.showLayoutTutorial && boardingStore.currentStep === 1"
          :text="$t('layoutTutorial.step1')"
        />
        <ExplanationComponent
          v-if="boardingStore.showLayoutTutorial && boardingStore.currentStep === 2"
          :text="$t('layoutTutorial.step2')"
        />
      </div>
      <div>
        <button
          id="ai-detection-button"
          class="btn btn-icon btn-ai-detection"
          @click="aiDetection"
          :disabled="!boardingStore.wholeTutorialSeen || !canvasStore.selectedImage"
          :class="{ 'highlighted': boardingStore.currentStep === 2 }">
            AI Detection
            <span v-if="!boardingStore.explainNav" class="tooltip">Run AI pizza detection</span>
          </button>
        </div>

        <div class="toolbar-sep"></div>

        <!-- Center image -->
        <div class="toolbar-item">
          <button
            id="center-image-button"
            class="btn tb-btn"
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

        <!-- Undo -->
        <div class="toolbar-item">
          <button
            id="undo-button"
            class="btn tb-btn"
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
            v-if="boardingStore.showLayoutTutorial && boardingStore.currentStep === 3"
            :text="$t('layoutTutorial.step3')"
          />
        </div>

        <div class="toolbar-sep"></div>

        <!-- Defect type selector -->
        <div class="toolbar-item">
          <button
            id="mtds-tool-btn"
            data-button="microtubularDefectsButton"
            class="btn tb-btn tb-btn-defect"
            @click="toggleMicrotubularDefects"
            :disabled="!boardingStore.wholeTutorialSeen"
            :class="{ 'highlighted': boardingStore.currentStep === 4 }">
            <span class="defect-name"
              :style="{
                color: selectedMicrotubularDefectColor,
                backgroundColor: selectedMicrotubularDefectColor + '25'
              }">
              {{ selectedMicrotubularDefectName }}
            </span>
            <fa :icon="['fas', 'chevron-down']" class="tb-chevron" :class="{ 'tb-chevron-up': microtubularDefectsOpen }" />
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

        <div class="toolbar-sep"></div>

        <!-- Opacity -->
        <div class="toolbar-item">
          <button
            id="opacity-button"
            class="btn tb-btn"
            data-button="opacityButton"
            @click="toggleOpacity($event)"
            :disabled="!boardingStore.wholeTutorialSeen"
            :class="{ 'highlighted': boardingStore.currentStep === 4, 'tb-btn-active': opacityOpen }">
            <fa :icon="['fas', 'circle-half-stroke']" />
            <span v-if="!boardingStore.explainNav && !opacityOpen" class="tooltip">{{$t('navigation.tooltips.changeOpacity')}}</span>
            <div v-if="opacityOpen" class="opacity-modal" ref="opacityModal">
              <div class="opacity-input">
                <p>Opacity:</p>
                <input type="number" v-model="sliderValue" class="slider-value-input" min="0" max="100"
                  @input="updateOpacity(sliderValue)" @click.stop />
              </div>
              <input class="slider" type="range" min="0" max="100" v-model="sliderValue"
                @input="updateOpacity(sliderValue)" />
            </div>
          </button>
        </div>

        <!-- Point size -->
        <div class="toolbar-item">
          <button
            id="point-size-button"
            class="btn tb-btn"
            data-button="pointSizeButton"
            @click="togglePointSize($event)"
            :disabled="!boardingStore.wholeTutorialSeen"
            :class="{ 'highlighted': boardingStore.currentStep === 4, 'tb-btn-active': pointSizeOpen }">
            <fa :icon="['fas', 'circle-dot']" />
            <span v-if="!boardingStore.explainNav && !pointSizeOpen" class="tooltip">{{$t('navigation.tooltips.changePointSize')}}</span>
            <div v-if="pointSizeOpen" class="opacity-modal" ref="pointSizeModal">
              <div class="opacity-input">
                <p>Point size:</p>
                <input type="number" v-model="pointValue" class="slider-value-input" min="5" max="25"
                  @input="updatePointSize(pointValue)" @click.stop />
              </div>
              <input class="slider" type="range" min="5" max="25" v-model="pointValue"
                @input="updatePointSize(pointValue)" />
            </div>
        </button>
        <ExplanationComponent
          v-if="boardingStore.showLayoutTutorial && boardingStore.currentStep === 4"
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
      <div>
        <button
          id="report-problem-button"
          type="button"
          class="btn btn-report-problem"
          data-button="reportProblemButton"
          @click="openReportProblemModal"
          :disabled="!boardingStore.wholeTutorialSeen"
        >
          <fa :icon="['fas', 'exclamation-triangle']" class="report-problem-icon" />
          {{ $t('navigation.reportProblem') }}
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

const hasAIAnnotations = computed(() => {
  if (!canvasStore.selectedImage) return false;
  return !!canvasStore.selectedImage.aiAnnotated ||
    annotationStore.annotations.some(
      (a) => a.imageId === canvasStore.selectedImage.imageId && a.type === 'AI'
    );
});

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
  color: active ? color : '#555',
  backgroundColor: active ? color + '44' : '#1a1a2e',
});

const emit = defineEmits(['systemStatus']);

const automaticAnnotation = createAutomaticAnnotationHandler(boardingStore, annotationStore, canvasStore);
const aiDetection = createAIDetectionHandler(imageStore, canvasStore, boardingStore);

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

const openReportProblemModal = () => {
  modalStore.openModal('reportProblem');
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
    padding: 10px 20px;
    flex-shrink: 0;
    background: var(--dark-dark1, #101021);
    border-bottom: 1px solid #1e1e32;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    z-index: 10;
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

  .logo {
    width: 30%;
  }

  /* ── Toolbar pill ── */
  .toolbar-pill {
    display: flex;
    align-items: center;
    gap: 2px;
    background: #16162a;
    border: 1px solid #2a2a40;
    border-radius: 12px;
    padding: 4px 6px;
  }

  .toolbar-item {
    position: relative;
  }

  .toolbar-sep {
    width: 1px;
    height: 22px;
    background: #2a2a40;
    margin: 0 4px;
    flex-shrink: 0;
  }

  /* ── Base toolbar button ── */
  .tb-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    min-width: 34px;
    padding: 0 10px;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    color: #a0a0c0;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .tb-btn:hover:not(:disabled) {
    background: #222238;
    color: #e0e0ff;
  }

  .tb-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .tb-btn-active,
  .tb-btn-active:hover {
    background: #1e2d5a;
    color: #7aacff;
  }

  .tb-label {
    font-size: 0.78rem;
    font-weight: 600;
  }

  .tb-chevron {
    font-size: 0.6rem;
    opacity: 0.6;
    transition: transform 0.2s;
  }

  .tb-chevron-up {
    transform: rotate(180deg);
  }

  /* ── AI button ── */
  .tb-btn-ai {
    width: 90px;
    justify-content: flex-start;
    gap: 5px;
    font-weight: 700;
    font-size: 0.85rem;
    color: #7aacff;
    border: 1px solid #2a3a60;
  }

  .tb-btn-ai:hover:not(:disabled) {
    background: #1e2d5a;
    border-color: #4a6aaa;
    color: #a0c8ff;
  }

  .tb-ai-label {
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .ai-filter-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── AI Detect button ── */
  .tb-btn-detect {
    color: #95F204;
    border: 1px solid #3a5010;
  }

  .tb-btn-detect:hover:not(:disabled) {
    background: #1e2e08;
    color: #b0f040;
    border-color: #6a8020;
  }

  .tb-btn-detect:disabled {
    opacity: 0.3;
  }

  /* ── Defect selector ── */
  .tb-btn-defect {
    min-width: 110px;
    justify-content: space-between;
    padding: 0 8px;
  }

  /* ── Dropdowns ── */
  .dropdown-content, .opacity-modal {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    z-index: 200;
    padding: 6px;
    margin: 0;
    list-style-type: none;
    background: #16162a;
    border: 1px solid #2a2a40;
    color: white;
    border-radius: 10px;
    min-width: 180px;
  }

  .dropdown-content li {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-radius: 6px;
    gap: 6px;
  }

  .dropdown-content li:hover {
    background: #222238;
  }

  .dropdown-content li.active {
    background: #1e2d5a;
  }

  .dropdown-content span {
    width: max-content;
  }

  .scrollable-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .scrollable-list::-webkit-scrollbar,
  .dropdown-content::-webkit-scrollbar {
    width: 4px;
  }

  .scrollable-list::-webkit-scrollbar-thumb,
  .dropdown-content::-webkit-scrollbar-thumb {
    background: #3a3a5a;
    border-radius: 4px;
  }

  .opacity-modal {
    width: 180px;
    padding: 10px 12px;
    left: 50%;
    transform: translateX(-50%);
  }

  .slider {
    width: 100%;
    padding: 0;
    margin: 4px 0 0 0;
  }

  .slider-value-input {
    text-align: center;
    padding: 4px 6px;
    width: 52px;
    background: #222238;
    border: 1px solid #3a3a5a;
    border-radius: 6px;
    color: white;
    font-size: 0.85rem;
  }

  .opacity-input {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.82rem;
    color: #a0a0c0;
    gap: 8px;
  }

  .opacity-input p {
    margin: 0;
  }

  /* Tutorial step 2: match AI button prominence (disabled otherwise fades AI Detection to 40%) */
  .btn-ai-detection.highlighted {
    opacity: 1 !important;
    border-color: #3e63dd !important;
    color: #fff !important;
  }

  .activeTool {
    background: #1e2d5a;
  }

  .dropdown-settings {
    right: 0;
    left: auto;
    min-width: 160px;
  }

  .dropdown-settings li {
    cursor: pointer;
  }

  .add-new-class {
    gap: 8px;
    margin: 4px 0 0 0;
    padding-top: 8px !important;
    border-top: 1px solid #2a2a40;
    color: #7a7aaa;
    font-size: 0.8rem;
  }

  .add-new-class:hover {
    color: #e0e0ff !important;
  }

  .dafect-name-list {
    margin-right: 8px;
  }

  .shortcut {
    font-family: monospace;
    margin-left: auto;
    background: #1a1a2e;
    color: #5a5a7a;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .shortcut-tooltip {
    margin-left: 5px;
    font-size: smaller;
  }

  /* ── AI filter dropdown ── */
  .ai-filter-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: 160px;
    background: #16162a;
    border: 1px solid #2a2a40;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    z-index: 200;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ai-filter-item {
    cursor: pointer;
    padding: 7px 10px;
    border-radius: 7px;
    font-weight: 600;
    font-size: 0.78rem;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: filter 0.12s;
  }

  .ai-filter-check {
    width: 14px;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .ai-filter-item:hover {
    filter: brightness(1.2);
  }

  /* ── Right side buttons ── */
  .navbar-right {
    gap: 6px;
  }

  .navbar-right .btn-outlined {
    font-size: 0.8rem;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid #2a2a40;
    color: #a0a0c0;
    background: transparent;
  }

  .navbar-right .btn-outlined:hover:not(:disabled) {
    background: #222238;
    color: #e0e0ff;
    border-color: #4a4a6a;
  }

  .navbar-right .btn-filled {
    font-size: 0.8rem;
    padding: 6px 14px;
    border-radius: 8px;
    background: #3E63DD;
    color: white;
    border: none;
    font-weight: 600;
  }

  .navbar-right .btn-filled:hover:not(:disabled) {
    background: #5577ee;
  }

  .navbar-right .btn-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #a0a0c0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .navbar-right .btn-icon:hover:not(:disabled) {
    background: #222238;
    color: #e0e0ff;
  .btn-report-problem {
    border: 1px solid var(--blue-blue3, #3e63dd);
    border-radius: 999px;
    padding: 6px 14px;
    gap: 8px;
    color: var(--blue-blue3, #3e63dd) !important;
    white-space: nowrap;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .btn-report-problem:hover:not(:disabled) {
    background: rgba(62, 99, 221, 0.12);
    color: var(--blue-blue3, #3e63dd) !important;
  }

  .btn-report-problem .report-problem-icon {
    font-size: 0.9rem;
  }

</style>
