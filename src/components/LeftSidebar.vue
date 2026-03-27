<template>
  <aside 
    id="leftSidebar" 
    class="left-sidebar"
  >
    <div class="search-bar">
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
      class="file-input"
      multiple
    />
    <button id="UploadImagesButton" class="btn btn-outlined btn-upload" @click="triggerFileInput">{{$t('leftSidebar.upload')}}</button>

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

.btn-upload {
  width: 90%;
  margin: 0;
  padding: 5px 10px;
  margin-bottom: 20px;
  margin-inline: auto;
}

.image-list {
  transition: background 0.2s ease-in;
  height: 100vh;
  border: dashed 2px #3e63dd77;
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
  background: #212134;
  border: dashed 2px #3E63DD;
}

.drag-and-drop {
  color: #737379;
  font-size: small;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
}

.image-list.has-images .drag-and-drop {
  display: none;
}

.svg-inline--fa {
  color: #737379;
  font-size: 1.5em;
  margin-bottom: 10px;
}

</style>
