<template>
  <!--<div id="app" @click="event => logHTMLEvent(event)">-->
  <div id="app">
    <Navbar
      ref="nav" 
      @systemStatus="handleStatusMessage"
    />
    <main class="content">
      <LeftSidebar 
        @openImageMenu="openImageMenu"
        @systemStatus="handleStatusMessage"
        @progressUpload="handleProgressUpload"
        @imageSelected="updateSelectedImage"
        :style="{ zIndex: boardingStore.explainLeftBar ? 10 : 0 }"
      />
      <AnnotatedImage 
        ref="annotatedImage" 
        @annotationSelected="updateSelectedAnnotation"
        @annotationPasted="pasteAnnotation"
        :style="{ zIndex: boardingStore.explainImage ? 10 : 0 }"
      />
      <RightSidebar 
        @annotationUpdated="updateSelectedAnnotation"
        @zoomToAnnotation="zoomToAnnotation"
        @systemStatus="handleStatusMessage"
        :style="{ zIndex: boardingStore.explainRightBar ? 10 : 0 }"
      />
    </main>
    
    <div v-if="!boardingStore.wholeTutorialSeen" class="overlay"></div>

    <Welcome v-if="boardingStore.showWelcomeModal" />

    <ImageChoices
      :isVisible="imageContextMenuVisible"
      :position="contextMenuPosition"
      :selectedImage="imageStore.rightClickedImage"
      @action="handleContextMenuAction"
    />
    
    <AITutorial />
    <AIDetectionTutorial />
    <DetailedStatistics />
    <Documentation />
    <DefectExamples />
    <Settings />
    <UserFeedback @systemStatus="handleStatusMessage" />
    <ReportProblemModal />
    <ExportModal @systemStatus="handleStatusMessage" />
    <ImageDeletion @systemStatus="handleStatusMessage" />
    <ImageAnnotationDeletion @systemStatus="handleStatusMessage" />
    <ImageAIAnnotationDeletion @systemStatus="handleStatusMessage" />
    <AddNewClass @systemStatus="handleStatusMessage" />
    <StatusModal ref="statusModal" />
    <UploadStatus ref="progressModal" />
    <AIOverrideFeedbackToast />

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useWebsocketStore } from './stores/websocketStore';
import { useBoardingStore } from './stores/BoardingStore';
import { useImageStore } from './stores/ImageStore';
import { useLoggingStore } from './stores/LoggStore';
import { useAnnotationStore } from './stores/AnnotationsStore';
import { useShortcutStore } from './stores/ShortcutStore';
import { useModalStore } from './stores/ModalStore';
import { useCanvasStore } from './stores/CanvasStore';

import Navbar from '@/components/Navbar.vue';
import LeftSidebar from '@/components/LeftSidebar.vue';
import RightSidebar from '@/components/RightSidebar.vue';
import AnnotatedImage from '@/components/AnnotatedImage.vue';
import DetailedStatistics from './components/Modals/DetailedStatistics.vue';
import Documentation from './components/Modals/Documentation.vue';
import DefectExamples from './components/Modals/DefectExamples.vue';
import Settings from './components/Modals/Settings.vue';
import UserFeedback from './components/Modals/UserFeedback.vue';
import ReportProblemModal from './components/Modals/ReportProblemModal.vue';
import ExportModal from './components/Modals/ConfirmModals/ExportModal.vue';
import ImageDeletion from './components/Modals/ConfirmModals/ImageDeletion.vue';
import ImageAnnotationDeletion from './components/Modals/ConfirmModals/ImageAnnotationDeletion.vue';
import ImageAIAnnotationDeletion from './components/Modals/ConfirmModals/ImageAIAnnotationDeletion.vue';
import AddNewClass from './components/Modals/AddNewClass.vue';
import StatusModal from './components/Modals/StatusInfo/GeneralStatusInfo.vue';
import ImageChoices from './components/ContextMenu/ImageChoices.vue';
import UploadStatus from './components/Modals/StatusInfo/UploadStatus.vue';
import AITutorial from './components/Modals/AITutorial.vue';
import AIDetectionTutorial from './components/Modals/AIDetectionTutorial.vue';
import Welcome from './components/Modals/Welcome.vue';
import AIOverrideFeedbackToast from './components/AIOverrideFeedbackToast.vue';

const boardingStore = useBoardingStore();
const modalStore = useModalStore();
const annotatedImage = ref(null);
const nav = ref(null);
const imageStore = useImageStore();
const shortcutStore = useShortcutStore();
const annotationStore = useAnnotationStore();
const loggingStore = useLoggingStore();
const statusModal = ref(null);
const progressModal = ref(null);
const canvasStore = useCanvasStore();

boardingStore.load();

const imageContextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });

const websocketStore = useWebsocketStore();
const url = 'ws://localhost:9090/client';
websocketStore.connect(url);

const updateSelectedAnnotation = (annotation) => {
  imageStore.setSelectedAnnotation(annotation);
  imageStore.setCroppedImage(annotatedImage.value.cropAnnotationArea(annotation));
  imageStore.updateActiveTab('Annotation');
};

const pasteAnnotation = () => {
  handleStatusMessage('paste');
};

const updateSelectedImage = () => {
  annotatedImage.value.drawImageWithPoints();
};

const zoomToAnnotation = (annotation) => {
  annotatedImage.value.zoomToAnnotation(annotation);
};

/*const logHTMLEvent = (event) => {
  const elements = [event.target];
  let parent = event.target.parentElement;
  while (parent !== null && parent.id !== 'app') {
    elements.push(parent);
    parent = parent.parentElement;
  }

  const el = elements.map((element) => ({
    id: element.id,
    classes: element.className,
    element: element.nodeName,
  }));

  loggingStore.logEvent({
    elements: el,
    x: event.x,
    y: event.y,
    clientX: event.clientX,
    clientY: event.clientY,
    screenX: event.screenX,
    screenY: event.screenY,
    pageX: event.pageX,
    pageY: event.pageY,
  });
};*/

const handleStatusMessage = (statusKey) => {
  if (statusModal.value && statusModal.value.showMessage) {
    statusModal.value.showMessage(statusKey);
  }
};

const handleProgressUpload = () => {
  if (progressModal.value && progressModal.value.updateProgress) {
    if(imageStore < 100) {
      progressModal.value.updateProgress(percentage);
    }
    else {
      progressModal.value.updateProgress(percentage);
      handleStatusMessage('images');
    }
  }
};

const openImageMenu = async (event, image) => {
  event.preventDefault();
  imageStore.setRightClickedImage(image);

  const clickX = event.clientX;
  const clickY = event.clientY;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  contextMenuPosition.value = { x: clickX, y: clickY };
  imageContextMenuVisible.value = true;

  await nextTick(); 

  const menuElement = document.querySelector('.context-menu');
  if (menuElement) {
    const menuWidth = menuElement.offsetWidth;
    const menuHeight = menuElement.offsetHeight;

    let posX = clickX;
    let posY = clickY;

    if (clickX + menuWidth > screenWidth) {
      posX = screenWidth - menuWidth - 10;
    }

    if (clickY + menuHeight > screenHeight) {
      posY = screenHeight - menuHeight - 10;
    }

    contextMenuPosition.value = { x: posX, y: posY };
  }

  document.addEventListener('click', closeContextMenu);
};

const handleContextMenuAction = ({ action, image }) => {
  if (action === 'delete') {
    modalStore.openModal( 'imageDeletion');
  } else if (action === 'unseen') {
    if (canvasStore.selectedImage === imageStore.rightClickedImage) {
      canvasStore.setImage(null);
    }
    imageStore.setOnceSeenImage(image);
  } else if (action === 'delete-annotations') {
    modalStore.openModal('annotationDeletion');
  } else if (action === 'delete-ai-annotation') {
    modalStore.openModal('AiDeletion');
  } else if (action === 'reviewed') {
    imageStore.setReviewed();
  }
  closeContextMenu();
};

const closeContextMenu = () => {
  imageContextMenuVisible.value = false;
  document.removeEventListener('click', closeContextMenu);
};

const handleKeydownEvent = (event) => {
  if (event.ctrlKey) {
    const key = event.key.toUpperCase();
    const shortcutCombination = `CTRL + ${key}`;

    if (shortcutStore.globalShortcuts[shortcutCombination]) {
      event.preventDefault();
      performShortcut(shortcutCombination);
    }
  }
};

const performShortcut = (shortcut) => {
  switch (shortcut) {
    case 'CTRL + A':
      modalStore.openModal("newClass");
      break;
    case 'CTRL + I':
      canvasStore.centerImage();
      break;
    case 'CTRL + C':
      imageStore.setCopiedAnnotation(imageStore.selectedAnnotation);
      handleStatusMessage('copy');
      break;
    case 'CTRL + V':
      annotatedImage.value.pasteAnnotation();
      break;
    case 'CTRL + Z':
      annotationStore.undoLastAction();
      handleStatusMessage('undo');
      break;
    case 'CTRL + O':
      nav.value.handleOpenProject();
      break;
    case 'CTRL + S':
      nav.value.saveProject();
      break;
    case 'CTRL + E':
      modalStore.openModal('export');
      break;
    default:
      console.log('No action for this shortcut');
      break;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydownEvent);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydownEvent);
});

</script>

<style>
  body {
    margin: 0;
    background-color: #212134;
    color: white;
    font-family: Arial, sans-serif;
    width: 100%;
  }

  .overlay {
    z-index: 9;
    display: flex;
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    backdrop-filter: blur(8px);
    justify-content: center;
    align-items: center;
    overflow-y: hidden;
  }

  #app {
    display: flex;
    flex-direction: column;
    height: 100vh; 
    padding: 0;
    width: 100%;
    margin: 0;
  }

  .content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    width: 100%;
  }

  .explanation {
    left: 15%;
  }

  #AITutorialModal,
  #AIDetectionTutorialModal {
    top: 7%;
    margin-top: 0;
  }

</style>