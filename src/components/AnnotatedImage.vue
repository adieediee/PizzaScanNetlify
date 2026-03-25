<template>
  <div class="annotated-image">
    <canvas v-if="!boardingStore.wholeTutorialSeen" ref="tutorialCanvas"></canvas>
    <canvas 
      v-else 
      ref="canvas" 
      @click="handleCanvasClick" 
      @wheel="handleZoom"
      @mousedown="startDragging" 
      @mousemove="handleDragging" 
      @mouseup="stopDragging"
      @mouseleave="stopDragging"
      @contextmenu="handleRightCanvasClick"
      :class="{ 'active-zoom': canvasStore.activeZoom, 'active-dragging': canvasStore.activeDragging, 'active-dragging-mouse-down': canvasStore.isDragging }"
    >
    </canvas>

    <ExplanationComponent
      v-if="boardingStore.explainImage"
      :text="$t('layoutTutorial.step6')"
    />

    <ManualExplanationComponent
      v-if="boardingStore.manualAnnotationTutorialOn"
    />

    <div
      v-if="aiReviewPopup.visible && aiReviewPopup.annotation"
      class="annotation-review-popup"
      :style="{ left: `${aiReviewPopup.left}px`, top: `${aiReviewPopup.top}px` }"
      @click.stop
    >
      <div class="popup-header">
        <div class="popup-title">
          <span class="popup-dot"></span>
          AI SUGGESTION
        </div>
        <div class="popup-confidence" :class="getConfidenceClass(aiReviewPopup.annotation.confidence)">
          {{ formatConfidence(aiReviewPopup.annotation.confidence) }}
        </div>
      </div>
      <div class="popup-body">
        <div class="popup-label">DEFECT TYPE</div>
        <div class="popup-select-wrapper">
          <select
            class="popup-defect-select"
            :value="aiReviewPopup.annotation.microtubularDefectValue"
            @change="handlePopupDefectTypeChange($event)"
          >
            <option
              v-for="defect in annotationStore.microtubularDefects"
              :key="defect.value"
              :value="defect.value"
            >
              {{ defect.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="popup-footer">
        <button class="popup-btn popup-btn-delete" @click="closeAiReviewPopup">Delete</button>
        <button class="popup-btn popup-btn-accept" @click="closeAiReviewPopup">Accept</button>
      </div>
    </div>

    <SubImageNavigation />
  </div>
</template>

<script setup>
import { useCanvasStore } from '@/stores/CanvasStore';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useImageStore } from '@/stores/ImageStore';
import { useBoardingStore } from '@/stores/BoardingStore';
import { onMounted, watch, ref, defineExpose, nextTick, onUnmounted } from 'vue';
import { useWebsocketStore } from '@/stores/websocketStore';

import Tv17 from '@/assets/images/Tv17.png';
import ManualExplanationComponent from './Modals/ManualExplanationComponent.vue';
import ExplanationComponent from './Modals/ExplanationComponent.vue';
import SubImageNavigation from './SubImageNavigation.vue';

const canvasStore = useCanvasStore();
const annotationStore = useAnnotationStore();
const imageStore = useImageStore();
const boardingStore = useBoardingStore();
const websocketStore = useWebsocketStore();

const canvas = ref(null);
const rect = ref(null);
const draggedPoint = ref(null);
let cachedImage = null;
const emit = defineEmits(['annotationSelected', 'annotationPasted']);

const tutorialCanvas = ref(null);
const cursorPosition = ref({ x: 0, y: 0 });
const aiReviewPopup = ref({
  visible: false,
  left: 0,
  top: 0,
  annotation: null
});

const closeAiReviewPopup = () => {
  aiReviewPopup.value.visible = false;
  aiReviewPopup.value.annotation = null;
};

const normalizeConfidence = (confidence) => {
  if (!Number.isFinite(confidence)) return null;
  const rawConfidence = confidence <= 1 ? confidence * 100 : confidence;
  return Math.max(0, Math.min(100, Math.round(rawConfidence)));
};

const formatConfidence = (confidence) => {
  const confidenceValue = normalizeConfidence(confidence);
  if (confidenceValue === null) return "Unknown confidence";
  return `${confidenceValue}% confidence`;
};

const getConfidenceClass = (confidence) => {
  const confidenceValue = normalizeConfidence(confidence);
  if (confidenceValue === null) return "confidence-medium";
  if (confidenceValue >= 80) return "confidence-high";
  if (confidenceValue >= 50) return "confidence-medium";
  return "confidence-low";
};

const openAiReviewPopup = (annotation, event) => {
  const popupWidth = 420;
  const popupHeight = 240;
  const gap = 16;

  let left = event.clientX + gap;
  let top = event.clientY - gap;

  if (left + popupWidth > window.innerWidth - gap) {
    left = event.clientX - popupWidth - gap;
  }
  if (left < gap) {
    left = gap;
  }
  if (top + popupHeight > window.innerHeight - gap) {
    top = window.innerHeight - popupHeight - gap;
  }
  if (top < gap) {
    top = gap;
  }

  aiReviewPopup.value = {
    visible: true,
    left,
    top,
    annotation
  };
};

const handlePopupDefectTypeChange = (event) => {
  const selectedDefectValue = event.target.value;
  const popupAnnotation = aiReviewPopup.value.annotation;
  if (!popupAnnotation) return;

  const selectedDefect = annotationStore.microtubularDefects.find(
    (defect) => defect.value === selectedDefectValue
  );
  if (!selectedDefect) return;

  popupAnnotation.microtubularDefectValue = selectedDefect.value;
  popupAnnotation.microtubularDefect = selectedDefect.name;
  popupAnnotation.defectColor = selectedDefect.color;
  popupAnnotation.color = selectedDefect.color;
};

watch(() => boardingStore.wholeTutorialSeen, (seen) => {
  if (!seen) {
    updateTutorialCanvasSize();
  } else {
    tutorialCanvas.value = null;

    nextTick(() => {
      updateCanvasSize();
      drawImageOnCanvas(imageStore.selectedImage.imageUrl);
    });
  }
});

const updateTutorialCanvasSize = () => {
  if (!tutorialCanvas.value) return;

  const canvas = tutorialCanvas.value;
  const ctx = canvas.getContext('2d');
  const parentWidth = canvas.parentElement.clientWidth;
  const parentHeight = canvas.parentElement.clientHeight;

  canvas.width = parentWidth;
  canvas.height = parentHeight;

  const image = new Image();
  image.src = Tv17;

  image.onload = () => {
    const scaleWidth = parentWidth / image.width;
    const scaleHeight = parentHeight / image.height;
    const scale = Math.min(scaleWidth, scaleHeight);

    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;
    const xOffset = (parentWidth - imgWidth) / 2; 
    const yOffset = (parentHeight - imgHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, xOffset, yOffset, imgWidth, imgHeight);

  };
};

onMounted(() => {
  if (!boardingStore.wholeTutorialSeen) {
    updateTutorialCanvasSize();
  }
  window.addEventListener('resize', updateCanvasSize);
});

const drawImageOnCanvas = (imgSrc) => {
  const img = new Image();
  img.src = imgSrc;
  img.onload = () => {
    cachedImage = img;
    updateCanvasSize();
    drawImageWithPoints();
  };
  img.onerror = () => {
    console.error("Failed to load image:", imgSrc);
  };
};

const updateCanvasSize = () => {
  const canvasWidth = canvas.value.parentElement.clientWidth;
  const canvasHeight = canvas.value.parentElement.clientHeight;

  canvas.value.width = canvasWidth;
  canvas.value.height = canvasHeight;

  rect.value = canvas.value.getBoundingClientRect();
  canvasStore.updateCanvasSize(canvasWidth, canvasHeight);
  drawImageWithPoints();
};


const handleCanvasClick = (event) => {
  if (canvasStore.isDragging) {
    canvasStore.isDragging = false;
    return;
  }
  if (!canvasStore.activeAnnotation) return;
  if (!canvasStore.selectedImage) return;
  
  const { x , y } = getMousePosition(event);

  let drawWidth, drawHeight;
  const imgWidth = cachedImage.width;
  const imgHeight = cachedImage.height;
  const imgAspectRatio = imgWidth / imgHeight;
  const canvasAspectRatio = canvas.value.width / canvas.value.height;

  if (imgAspectRatio > canvasAspectRatio) {
    drawWidth = canvas.value.width;
    drawHeight = canvas.value.width / imgAspectRatio;
  } else {
    drawHeight = canvas.value.height;
    drawWidth = canvas.value.height * imgAspectRatio;
  }

  const startX = canvasStore.imageDrawStartWidth;
  const startY = canvasStore.imageDrawStartHeight;
  const endX = startX + imgWidth * (drawWidth / imgWidth);
  const endY = startY + imgHeight * (drawHeight / imgHeight);

  if (x < startX || x > endX || y < startY || y > endY) {
    return;
  }
  
  let clickedPoint = null;
  if (annotationStore.annotations.length > 0) {
    clickedPoint = annotationStore.annotations.find(point => {
      if (point.imageId !== canvasStore.selectedImage.imageId) return false;
      if (point.type === "manual") {
        const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        return distance < 20 / canvasStore.zoomScale;
      } else if (point.type === "AI") {
        return (
          x >= point.x1 && x <= point.x2 && 
          y >= point.y1 && y <= point.y2
        );
      }
      return false;
    });
  }

  if (clickedPoint) {
    if (clickedPoint.type === "AI") {
      openAiReviewPopup(clickedPoint, event);
    } else {
      closeAiReviewPopup();
    }

    if (clickedPoint.active) {
      const index = annotationStore.annotations.indexOf(clickedPoint);
      annotationStore.updateDyneinArmsOnClick(index);
    } else {
      annotationStore.updateAnnotationActive(clickedPoint, canvasStore.currentOpacity, canvasStore.currentSize);
    }
    drawImageWithPoints();
    emit('annotationSelected', clickedPoint);
    imageStore.updateActiveTab('Annotation');
  } else { 
    closeAiReviewPopup();
    annotationStore.addAnnotation(
      canvasStore.selectedImage.imageId, 
      canvasStore.selectedAnnotationType,             
      x,                          
      y,                          
      'unknown',                  
    );

    annotationStore.updateAnnotationActive(annotationStore.annotations[annotationStore.annotations.length - 1], canvasStore.currentOpacity, canvasStore.currentSize);
    imageStore.setSelectedAnnotation(annotationStore.annotations[annotationStore.annotations.length - 1]);
    
    drawImageWithPoints();
    
    imageStore.setCroppedImage(cropAnnotationArea(annotationStore.annotations[annotationStore.annotations.length - 1]));
    imageStore.updateActiveTab('Annotation');
    emit('annotationSelected', annotationStore.annotations[annotationStore.annotations.length - 1]);
  }
};

const handleRightCanvasClick = (event) => {
  event.preventDefault(); 

  if (!canvasStore.selectedImage) return;
  
  const { x, y } = getMousePosition(event);

  let clickedAnnotation = null;

  if (annotationStore.annotations.length > 0) {
    clickedAnnotation = annotationStore.annotations.find(annotation => {
      if (annotation.imageId !== canvasStore.selectedImage.imageId) return false;
      if (annotation.type === "manual") {
        const distance = Math.sqrt((x - annotation.x) ** 2 + (y - annotation.y) ** 2);
        return distance < 20 / canvasStore.zoomScale;
      } else if (annotation.type === "AI") {
        return (
          x >= annotation.x1 && x <= annotation.x2 && 
          y >= annotation.y1 && y <= annotation.y2
        );
      }
      return false;
    });
  }

  if (clickedAnnotation) {
    closeAiReviewPopup();
    annotationStore.deleteAnnotation(clickedAnnotation);
    drawImageWithPoints();
    imageStore.setSelectedAnnotation(null);
  } else {
    closeAiReviewPopup();
  }
};


const drawImageWithPoints = (minimap = true, zooming = true) => {
  const ctx = canvas.value.getContext("2d", { willReadFrequently: true });

  if (!canvasStore.selectedImage || !cachedImage) return;

  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  ctx.save();

  if (zooming) {
    ctx.translate(canvasStore.offsetX*canvasStore.zoomScale - canvasStore.offsetZoomX, canvasStore.offsetY*canvasStore.zoomScale - canvasStore.offsetZoomY);
    ctx.scale(canvasStore.zoomScale, canvasStore.zoomScale);
  }

  const imgWidth = cachedImage.width;
  const imgHeight = cachedImage.height;
  const imgAspectRatio = imgWidth / imgHeight;
  const canvasAspectRatio = canvas.value.width / canvas.value.height;

  let drawWidth, drawHeight;

  if (imgAspectRatio > canvasAspectRatio) {
    drawWidth = canvas.value.width;
    drawHeight = canvas.value.width / imgAspectRatio;
  } else {
    drawHeight = canvas.value.height;
    drawWidth = canvas.value.height * imgAspectRatio;
  }

  const x = (canvas.value.width - drawWidth) / 2;
  const y = (canvas.value.height - drawHeight) / 2;

  canvasStore.imageDrawStartWidth = x;
  canvasStore.imageDrawStartHeight = y;
  canvasStore.imageScale = drawWidth / imgWidth;
  ctx.drawImage(cachedImage, x, y, drawWidth, drawHeight);

  annotationStore.annotations.forEach(point => {
    if (point.imageId !== canvasStore.selectedImage.imageId) return;
    if(point.type === 'AI') {
      drawAIPoint(
        ctx,
        point.x1,
        point.y1,
        point.x2,
        point.y2,
        point.color,
        point.defectColor,
        point.dyneinArmsValue,
        point.opacity,
        zooming ? point.size : point.size * canvasStore.zoomScale,
        point.confidence
      );
    } else {
      drawPoint(ctx, point.x, point.y, point.dyneinArmsValue, point.color, point.opacity, zooming ? point.size : point.size * canvasStore.zoomScale);
    }
  });

  ctx.restore();

  if (minimap && canvasStore.zoomScale > 1)
    drawMinimap(ctx);
};

const drawPoint = (ctx, x, y, dynein_arms, color, opacity, size) => {
  ctx.beginPath();
  size = size / canvasStore.zoomScale;

  const colorWithOpacity = applyOpacityToColor(color, opacity);
  ctx.fillStyle = colorWithOpacity;
  const blackColor = applyOpacityToColor("#000000", opacity);

  const lineWidth = 5 * size / 14;

  if (dynein_arms === 'unknown') {
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
  } else if (dynein_arms === 'both-arms-missing') {
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = blackColor; 
    ctx.stroke();
  } else if (dynein_arms === 'outer-arms-missing') {
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.lineWidth = lineWidth ;
    ctx.strokeStyle = blackColor; 
    ctx.stroke();
  } else if (dynein_arms === 'no-arms-missing') {
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size - 15*size / 14, y);
    ctx.lineTo(x + size + 15*size / 14, y);
    ctx.lineWidth = lineWidth ;
    ctx.strokeStyle = blackColor; 
    ctx.stroke();
  } else if (dynein_arms === 'inner-arms-missing') {
    ctx.moveTo(x - size - size / 2, y);
    ctx.lineTo(x + size + size / 2, y);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = blackColor; 
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = colorWithOpacity;
    ctx.fill();
    ctx.closePath();
  }
};

const drawAIPoint = (ctx, x1, y1, x2, y2, color, defectColor, dynein_arms, opacity, size, confidence) => {
  ctx.beginPath();
  size = size / canvasStore.zoomScale;

  const lineWidth = 5 * size / 14;
  const confidencePctRaw = Number.isFinite(confidence) ? (confidence <= 1 ? confidence * 100 : confidence) : null;
  const confidencePct = Number.isFinite(confidencePctRaw) ? Math.max(0, Math.min(100, Math.round(confidencePctRaw))) : null;
  const confidenceColor = confidencePct === null
    ? null
    : confidencePct >= 80
      ? "#95F204"
      : confidencePct >= 50
        ? "#FACC15"
        : "#EF4444";

  const width = x2 - x1;
  const height = y2 - y1;
  
  ctx.fillStyle = applyOpacityToColor(confidenceColor || color, 20);
  ctx.fillRect(x1, y1, width, height);

  ctx.strokeStyle = confidenceColor || color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x1, y1, width, height);

  const markerColor = defectColor || color;
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const circleRadius = Math.max(4, Math.min(width, height) * 0.08);
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
  ctx.fillStyle = markerColor;
  ctx.fill();

  if (confidencePct !== null) {
    const confidenceLabel = `${confidencePct}% confidence`;
    const labelFontSize = Math.max(10, Math.round((12 * size) / 7));
    const horizontalPadding = Math.max(4, Math.round((6 * size) / 7));
    const verticalPadding = Math.max(2, Math.round((4 * size) / 7));
    const labelHeight = labelFontSize + verticalPadding * 2;

    ctx.save();
    ctx.font = `${labelFontSize}px Arial`;
    const labelWidth = Math.ceil(ctx.measureText(confidenceLabel).width) + horizontalPadding * 2;
    const labelX = x1;
    const labelY = Math.max(0, y1 - labelHeight - 2);

    ctx.fillStyle = confidenceColor;
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    ctx.fillStyle = confidencePct >= 50 ? "#101021" : "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(confidenceLabel, labelX + horizontalPadding, labelY + labelHeight / 2);
    ctx.restore();
  }

  ctx.strokeStyle = "black";

  if (dynein_arms === 'unknown') {
  } else if (dynein_arms === 'both-arms-missing') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x2, y1);
    ctx.lineTo(x1, y2);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  } else if (dynein_arms === 'outer-arms-missing') {
    ctx.beginPath();
    ctx.moveTo(x1, (y1 + y2) / 2);
    ctx.lineTo(x2, (y1 + y2) / 2);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  } else if (dynein_arms === 'no-arms-missing') {
    ctx.beginPath();
    ctx.moveTo(x1 - 15 * size / 14, (y1 + y2) / 2);
    ctx.lineTo(x2 + 15 * size / 14, (y1 + y2) / 2);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  } else if (dynein_arms === 'inner-arms-missing') {
    ctx.beginPath();
    ctx.moveTo(x1 - width * 0.3, (y1 + y2) / 2);
    ctx.lineTo(x1, (y1 + y2) / 2);
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, (y1 + y2) / 2);
    ctx.lineTo(x2 + width * 0.3, (y1 + y2) / 2);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  ctx.closePath();
};


const drawMinimap = (ctx) => {
  const minimapWidth = 200;
  const minimapHeight = 150;
  const minimapX = canvas.value.width - minimapWidth - 10;
  const minimapY = canvas.value.height - minimapHeight - 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);

  const imgWidth = canvas.value.width;
  const imgHeight = canvas.value.height;
  const imgAspectRatio = imgWidth / imgHeight;
  const minimapAspectRatio = minimapWidth / minimapHeight;

  let drawWidth, drawHeight;

  if (imgAspectRatio > minimapAspectRatio) {
    drawWidth = minimapWidth;
    drawHeight = minimapWidth / imgAspectRatio;
  } else {
    drawHeight = minimapHeight;
    drawWidth = minimapHeight * imgAspectRatio;
  }

  ctx.save();

  const x = 0;
  let y = 0;
  ctx.globalAlpha = 0.6;

  ctx.translate(minimapX, minimapY);

  ctx.drawImage(cachedImage, 0, 0, drawWidth, drawHeight);

  ctx.restore();
  ctx.save();


  ctx.translate(-canvasStore.offsetX * minimapWidth / imgWidth, -canvasStore.offsetY * minimapHeight / imgHeight);
  ctx.translate(minimapX, minimapY);
  ctx.translate(drawWidth/2, drawHeight/2);
  ctx.scale(1/canvasStore.zoomScale, 1/canvasStore.zoomScale);
  ctx.translate(-drawWidth/2, -drawHeight/2);


  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, drawWidth, drawHeight);
  ctx.restore();

};

const applyOpacityToColor = (color, opacity) => {
  const rgb = color.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    return `rgba(${rgb[1]}, ${opacity / 100})`; 
  }
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  }
  return color;
};

watch(() => boardingStore.explainImage, (newState) => {
});

watch(() => canvasStore.selectedImage, (newImage) => {
  closeAiReviewPopup();
  if (newImage) {
    drawImageOnCanvas(newImage.imageUrl);
  } else {
    clearCanvas();
  }
});

watch(() => canvasStore.currentOpacity, (newOpacity) => {
  annotationStore.updateAllAnnotationOpacities(newOpacity);
  drawImageWithPoints();
});

watch(() => canvasStore.currentSize, (newSize) => {
  annotationStore.updateAllAnnotationSizes(newSize);
  drawImageWithPoints();
});

watch(() => annotationStore.annotations, (newAnnotations) => {
  drawImageWithPoints();
}, { deep: true });

watch(() => annotationStore.AIannotations, (newAnnotations) => {
  drawImageWithPoints();
}, { deep: true });

watch(() => canvasStore.zoomScale, (newZoomScale) => {

  drawImageWithPoints();
});

watch(() => canvasStore.dragStartX, (newDragStartX) => {
  drawImageWithPoints();
});

watch(() => boardingStore.manualAnnotationTutorialOn, (newState) => {});

onMounted(() => {
  window.addEventListener('scroll', closeAiReviewPopup);
  if (canvasStore.selectedImage) {
    drawImageOnCanvas(canvasStore.selectedImage.imageUrl);
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', closeAiReviewPopup);
});

const getMousePosition = (event) => {
  if(!rect.value) return { x: 0, y: 0 };

  const x = (event.clientX - rect.value.left - canvasStore.offsetX * canvasStore.zoomScale + canvasStore.offsetZoomX) / canvasStore.zoomScale;
  const y = (event.clientY - rect.value.top - canvasStore.offsetY * canvasStore.zoomScale + canvasStore.offsetZoomY) / canvasStore.zoomScale;
  return { x, y };
}

const handleZoom = (event) => {
  event.preventDefault();
  const zoomIntensity = 0.1;
  const zoomDirection = event.deltaY > 0 ? -1 : 1;
  const zoomFactor = canvasStore.zoomScale + zoomDirection * zoomIntensity;

  const newZoomScale = Math.max(canvasStore.minScale, Math.min(canvasStore.maxScale, zoomFactor));

  canvasStore.offsetZoomX = (canvas.value.width * newZoomScale - canvas.value.width) / 2;
  canvasStore.offsetZoomY = (canvas.value.height * newZoomScale - canvas.value.height) / 2;
  canvasStore.setZoomScale(newZoomScale);

  drawImageWithPoints();
};

const startDragging = (event) => {
  if(event.button === 2) return;

  const { x , y } = getMousePosition(event);

  let clickedPoint = null;
  if (annotationStore.annotations.length > 0) {
    clickedPoint = annotationStore.annotations.find(point => {
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      return distance < 20 / canvasStore.zoomScale; 
    });
  }
  if(clickedPoint) {
    draggedPoint.value = {
      point: clickedPoint
    };
  }
  else{
  canvasStore.dragStartX = event.clientX - canvasStore.offsetX;
  canvasStore.dragStartY = event.clientY - canvasStore.offsetY;
   }
  canvasStore.isMouseDown = true;
};

const handleDragging = (event) => {
  cursorPosition.value = getMousePosition(event);

  if (!canvasStore.isMouseDown ) return;
  canvasStore.isDragging = true;

  const {x,y} = getMousePosition(event)

  if(draggedPoint.value) {
    draggedPoint.value.point.x = x
    draggedPoint.value.point.y = y

    const linked = annotationStore.getLinkedAnnotation(draggedPoint.value.point);
    if (linked) {
      const crop = draggedPoint.value.point.isSubImageAnnotation
        ? draggedPoint.value.point.subImageCrop
        : linked.subImageCrop;
      const scale = canvasStore.imageScale;
      if (crop) {
        if (draggedPoint.value.point.isSubImageAnnotation) {
          linked.x = x + crop.x * scale;
          linked.y = y + crop.y * scale;
        } else {
          linked.x = x - crop.x * scale;
          linked.y = y - crop.y * scale;
        }
      }
    }

  } else {
  const newOffsetX = event.clientX - canvasStore.dragStartX;
  const newOffsetY = event.clientY - canvasStore.dragStartY;

  const imgWidth = cachedImage.width * canvasStore.zoomScale - canvasStore.offsetZoomX;
  const imgHeight = cachedImage.height * canvasStore.zoomScale - canvasStore.offsetZoomY;

  const minX = Math.min(0, canvas.value.width - imgWidth); 
  const minY = Math.min(0, canvas.value.height - imgHeight); 
  const maxX = Math.max(0, (imgWidth - canvas.value.width) / 2);
  const maxY = Math.max(0, (imgHeight - canvas.value.height) / 2);

  canvasStore.offsetX = Math.min(maxX, Math.max(minX, newOffsetX));
  canvasStore.offsetY = Math.min(maxY, Math.max(minY, newOffsetY));
  }

  drawImageWithPoints();
};

const stopDragging = () => {
  canvasStore.isMouseDown = false;
  draggedPoint.value = null;
};

const clearCanvas = () => {
  const ctx = canvas.value.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  cachedImage = null;
};

const cropAnnotationArea = (annotation) => {
  if(!annotation) return;

  drawImageWithPoints(false,false);

  const ctx = canvas.value.getContext('2d', { willReadFrequently: true });
  const x = annotation.x || annotation.x1;
  const y = annotation.y || annotation.y1;
  const width = 600;
  const height = 400;
  const croppedImageData = ctx.getImageData(x - width/2, y - height/2, width, height);
  ctx.restore();
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCtx.putImageData(croppedImageData, 0, 0);
  return tempCanvas.toDataURL();
};

const zoomToAnnotation = (annotation) => {
  if (!annotation || !cachedImage) return;

  const canvasWidth = canvas.value.width;
  const canvasHeight = canvas.value.height;
  const zoomFactor = 2;

  annotationStore.updateAnnotationActive(annotation, canvasStore.currentOpacity, canvasStore.currentSize);

  const newZoomScale = Math.min(
    canvasStore.maxScale,
    Math.max(canvasStore.minScale, zoomFactor)
  );

  canvasStore.offsetZoomX = (canvas.value.width * newZoomScale - canvas.value.width) / 2;
  canvasStore.offsetZoomY = (canvas.value.height * newZoomScale - canvas.value.height) / 2;

  const offsetX = canvasWidth / 2 - (annotation.x || annotation.x2);
  const offsetY = canvasHeight / 2 - (annotation.y || annotation.y2);

  canvasStore.zoomScale = newZoomScale;
  canvasStore.offsetX = offsetX;
  canvasStore.offsetY = offsetY;

  drawImageWithPoints();
};

const pasteAnnotation = () => {
  const copiedAnnotation = useImageStore().copiedAnnotation;
  if (!copiedAnnotation) return;

  const x = cursorPosition.value.x;
  const y = cursorPosition.value.y;

  let clickedAnnotation = null;
  if (annotationStore.annotations.length > 0) {
    clickedAnnotation = annotationStore.annotations.find(annotation => {
      const distance = Math.sqrt((x - annotation.x) ** 2 + (y - annotation.y) ** 2);
      return distance < 10 / canvasStore.zoomScale;
    });
  }

  if (!clickedAnnotation) {
    annotationStore.addAnnotation(
      useCanvasStore().selectedImage.imageId,
      copiedAnnotation.microtubularDefectValue,
      x,
      y,
      copiedAnnotation.dyneinArmsValue,
    );
    annotationStore.updateAnnotationActive(annotationStore.annotations[annotationStore.annotations.length - 1], canvasStore.currentOpacity, canvasStore.currentSize);
    imageStore.setSelectedAnnotation(annotationStore.annotations[annotationStore.annotations.length - 1]);
    imageStore.setCroppedImage(cropAnnotationArea(annotationStore.annotations[annotationStore.annotations.length - 1]));
    imageStore.updateActiveTab('Annotation');
    emit('annotationPasted');
  }
};

defineExpose({
  drawImageWithPoints,
  clearCanvas,
  drawImageOnCanvas,
  cropAnnotationArea,
  zoomToAnnotation,
  pasteAnnotation
});

</script>

<style scoped>
.annotated-image {
  display: flex;
  flex: 7;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 95vh;
  margin-top: 2%;
  position: relative;
  z-index: -1;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
}

.active-zoom {
  cursor: zoom-in;
}

.active-dragging {
  cursor: grab;
}

.active-dragging-mouse-down {
  cursor: grabbing;
}

.explanation {
  top: 5%;
}

.annotation-review-popup {
  position: fixed;
  width: 420px;
  background: #1d2b4a;
  border: 1px solid #2d3d60;
  border-radius: 10px;
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.35);
  z-index: 1000;
  color: #d5dbe8;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 22px;
  border-bottom: 1px solid #2d3d60;
}

.popup-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.popup-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #2dd4bf;
}

.popup-confidence {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
}

.confidence-high {
  background: #95f204;
  color: #101021;
}

.confidence-medium {
  background: #facc15;
  color: #101021;
}

.confidence-low {
  background: #ef4444;
  color: #ffffff;
}

.popup-body {
  padding: 20px 22px;
  border-bottom: 1px solid #2d3d60;
}

.popup-label {
  font-size: 16px;
  letter-spacing: 1px;
  color: #a9b4c8;
  margin-bottom: 12px;
}

.popup-select-wrapper {
  display: flex;
}

.popup-defect-select {
  width: 100%;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid #31486f;
  background: #152542;
  color: #d5dbe8;
  padding: 0 12px;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  padding: 22px;
}

.popup-btn {
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
}

.popup-btn-delete {
  background: #f87171;
}

.popup-btn-accept {
  background: #10b981;
}

@media (max-width: 1024px) {
  .annotated-image {
      margin-top: 3.5%;
  }
}

</style>
