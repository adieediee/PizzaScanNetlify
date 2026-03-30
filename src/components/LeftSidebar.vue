<template>
  <aside 
    id="leftSidebar" 
    class="left-sidebar"
  >
    <div class="sidebar-top">
      <div class="search-bar">
        <fa :icon="['fas', 'magnifying-glass']" class="search-icon" />
        <input
          id="searchBar"
          type="text"
          v-model="query"
          :placeholder="$t('leftSidebar.search')"
          class="search-input"
        />
        <button class="clear-button" @click="clearSearch" v-if="query">
          <fa :icon="['fas', 'xmark']" />
        </button>
      </div>

      <input
        type="file"
        ref="fileInput"
        @change="handleFileUpload"
        accept="image/*"
        style="display:none"
        multiple
      />
      <button id="UploadImagesButton" class="btn-upload" @click="triggerFileInput">
        <fa :icon="['fas', 'plus']" class="upload-icon" />
        {{$t('leftSidebar.upload')}}
      </button>
    </div>

    <div 
      :class="['image-list', { 'has-images': imageStore.uploadedImages.length > 0, 'drag-over': isDragging }]"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div 
        v-if="imageStore.uploadedImages.length === 0" 
        class="drag-and-drop"
        @click="triggerFileInput"
      >
        <fa :icon="['fas', 'upload']" />
        <p>
          {{$t('leftSidebar.dragAndDrop')}}
        </p>
      </div>
      
      <List v-else
        :images="!boardingStore.wholeTutorialSeen ? boardingStore.images : filteredImages"
        :getAnnotations="boardingStore.wholeTutorialSeen ? annotationStore.getAnnotations : () => boardingStore.annotations"
        :selectedAnnotation="imageStore.selectedAnnotation"
        @selectImage="selectImage"
        @toggleChevron="toggleChevron"
        @openImageMenu="openImageMenu"
        @selectSubImage="selectSubImage"
      />
    </div>    

    <ExplanationComponent
      v-if="boardingStore.showLayoutTutorial && boardingStore.explainLeftBar"
      :text="$t('layoutTutorial.step5')"
    />
  </aside>
</template>

<script setup>
import * as TIFF from 'tiff.js';
import { ref, computed } from 'vue';
import { useCanvasStore } from '@/stores/CanvasStore';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useImageStore } from '@/stores/ImageStore';
import { useBoardingStore } from '@/stores/BoardingStore';
import List from './LeftsideSections/List.vue';
import ExplanationComponent from './Modals/ExplanationComponent.vue';

const canvasStore = useCanvasStore();
const annotationStore = useAnnotationStore();
const imageStore = useImageStore();
const boardingStore = useBoardingStore();

const fileInput = ref(null);
const query = ref('');
const isDragging = ref(false);

const emit = defineEmits(['openImageMenu', 'systemStatus', 'imageSelected']);

const selectImage = (img, index) => {
  canvasStore.setImage(img);
  imageStore.updateImageInfo(index);
  imageStore.setSeenImage(index);
  emit('imageSelected');
};

const selectSubImage = (parentImage, subImage) => {
  imageStore.selectSubImage(parentImage, subImage);
  emit('imageSelected');
};

const processFiles = (files) => {
  const errors = [];
  let filesProcessed = 0;
  let numberFiles = files.length;

  imageStore.uploadModalVisible = true;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const imageName = file.name.split('.')[0];
        let imageUrl = e.target.result;
        let tiffVersion = null; 
        let rawTiffData = null;

        if (file.type === 'image/tiff' || file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
          const tiff = new Tiff({ buffer: e.target.result });
          const canvas = tiff.toCanvas();
          imageUrl = canvas.toDataURL('image/png'); 

          rawTiffData = e.target.result;
          tiffVersion = 'TIFF';
        }

        imageStore.addImage({
          imageUrl: imageUrl, 
          imageName: imageName,
          isOpen: false,
          onceOpen: false,
          reviewed: false,
          imageId: undefined,
          description: "",
          tiffVersion: tiffVersion,
          rawTiffData: rawTiffData,
        });

        filesProcessed++;
        imageStore.currentPercentageUpload = (filesProcessed / numberFiles) * 100;

      } catch (error) {
        console.error(`Error processing file: ${file.name}`, error);
        errors.push(`Error processing file: ${file.name}`);
      }
    };

    if (file.type === 'image/tiff' || file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsDataURL(file);
    }
  }

  const interval = setInterval(() => {
    if (filesProcessed === numberFiles) {
      clearInterval(interval);
      imageStore.uploadModalVisible = false;
      emit('systemStatus', 'images');
    }
  }, 100);

  event.target.value = '';
  
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileUpload = (event) => {
  const files = event.target.files;
  processFiles(files);
};


const handleDragOver = () => {
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event) => {
  isDragging.value = false;
  const files = event.dataTransfer.files;
  processFiles(files);
};

const clearSearch = () => {
  query.value = '';
};

const filteredImages = computed(() => {
  return imageStore.uploadedImages.filter(item =>
    item.imageName.toLowerCase().includes(query.value.toLowerCase())
  );
});

const toggleChevron = (index) => {
  imageStore.setOpenImage(index);
};

const openImageMenu = (event, image) => {
  emit('openImageMenu', event, image);
};

</script>

<style scoped>
.file-input {
  display: none;
}

/* ── Sidebar top toolbar ──────────────────────────────────── */
.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 10px 8px 10px;
  border-bottom: 1px solid #1e1e32;
}

/* Search bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #23233a;
  border-radius: 8px;
  padding: 0 10px;
  height: 32px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.search-bar:focus-within {
  border-color: #3e63dd88;
  box-shadow: 0 0 0 2px rgba(62, 99, 221, 0.12);
}

.search-icon {
  color: #44446a;
  font-size: 0.72rem;
  flex-shrink: 0;
  pointer-events: none;
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: #c8c8e8;
  font-size: 0.78rem;
  flex: 1;
  min-width: 0;
  font-family: inherit;
  /* reset global input styles */
  width: auto;
  margin: 0;
  padding: 0;
  border-radius: 0;
}

.search-input::placeholder {
  color: #44446a;
}

.clear-button {
  background: none;
  border: none;
  color: #44446a;
  cursor: pointer;
  padding: 0;
  font-size: 0.7rem;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.15s;
}

.clear-button:hover {
  color: #9090c0;
}

/* Upload button */
.btn-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  font-size: 0.78rem;
  font-family: inherit;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid #2e2e50;
  background: rgba(62, 99, 221, 0.08);
  color: #7a90dd;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
  letter-spacing: 0.01em;
}

.btn-upload:hover {
  background: rgba(62, 99, 221, 0.18);
  color: #aabcff;
  border-color: #3e63dd66;
  box-shadow: 0 0 0 1px rgba(62, 99, 221, 0.1);
}

.btn-upload .upload-icon {
  font-size: 0.7rem;
  flex-shrink: 0;
}

/* ── Image list / drop zone ───────────────────────────────── */
.image-list {
  transition: background 0.2s ease-in;
  height: 100vh;
  border: dashed 2px #3e63dd55;
  position: relative;
  display: flex;
  flex-direction: column;
}

.image-list.has-images {
  align-items: flex-start;
  justify-content: flex-start;
  border: none;
}

.image-list.drag-over {
  background: #1a1a30;
  border: dashed 2px #3E63DD;
}

.drag-and-drop {
  color: #44446a;
  font-size: 0.78rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
  user-select: none;
}

.drag-and-drop :deep(.svg-inline--fa) {
  font-size: 1.4rem;
  color: #33335a;
  margin-bottom: 0;
}

.image-list.has-images .drag-and-drop {
  display: none;
}

</style>
