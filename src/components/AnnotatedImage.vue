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
        <button class="popup-btn popup-btn-delete" @click="deleteAiAnnotation">Delete</button>
        <button class="popup-btn popup-btn-accept" @click="acceptAiAnnotation">Accept</button>
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

const acceptAiAnnotation = () => {
  const annotation = aiReviewPopup.value.annotation;
  if (annotation) {
    annotation.x = (annotation.x1 + annotation.x2) / 2;
    annotation.y = (annotation.y1 + annotation.y2) / 2;
    annotation.type = 'manual';
    drawImageWithPoints();
  }
  aiReviewPopup.value.visible = false;
  aiReviewPopup.value.annotation = null;
};

const deleteAiAnnotation = () => {
  const annotation = aiReviewPopup.value.annotation;
  if (annotation) {
    annotationStore.deleteAnnotation(annotation);
    drawImageWithPoints();
    imageStore.setSelectedAnnotation(null);
  }
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
  if (confidenceValue >= 80) return "AI is confident";
  if (confidenceValue >= 50) return "Needs review";
  return "Needs close inspection";
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
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvas.value.parentElement.clientWidth;
  const canvasHeight = canvas.value.parentElement.clientHeight;

  canvas.value.style.width = canvasWidth + 'px';
  canvas.value.style.height = canvasHeight + 'px';
  canvas.value.width = Math.round(canvasWidth * dpr);
  canvas.value.height = Math.round(canvasHeight * dpr);

  rect.value = canvas.value.getBoundingClientRect();
  canvasStore.updateCanvasSize(canvasWidth, canvasHeight);
  drawImageWithPoints();
};


const handleCanvasClick = (event) => {
  if (canvasStore.isDragging) {
    canvasStore.isDragging = false;
    return;
  }

  if (aiReviewPopup.value.visible) {
    closeAiReviewPopup();
    return;
  }

  if (!canvasStore.activeAnnotation) return;
  if (!canvasStore.selectedImage) return;
  
  const { x , y } = getMousePosition(event);

  let drawWidth, drawHeight;
  const imgWidth = cachedImage.width;
  const imgHeight = cachedImage.height;
  const imgAspectRatio = imgWidth / imgHeight;
  const canvasAspectRatio = canvas.value.clientWidth / canvas.value.clientHeight;

  if (imgAspectRatio > canvasAspectRatio) {
    drawWidth = canvas.value.clientWidth;
    drawHeight = canvas.value.clientWidth / imgAspectRatio;
  } else {
    drawHeight = canvas.value.clientHeight;
    drawWidth = canvas.value.clientHeight * imgAspectRatio;
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
        const isPixelCoord = point.isMappedFromSubImage || point.isSubImageAnnotation;
        const ax = isPixelCoord
          ? point.x * canvasStore.imageScale + canvasStore.imageDrawStartWidth
          : point.x;
        const ay = isPixelCoord
          ? point.y * canvasStore.imageScale + canvasStore.imageDrawStartHeight
          : point.y;
        const distance = Math.sqrt((x - ax) ** 2 + (y - ay) ** 2);
        return distance < 20 / canvasStore.zoomScale;
      } else if (point.type === "AI") {
        const pct = Number.isFinite(point.confidence)
          ? Math.max(0, Math.min(100, Math.round((point.confidence <= 1 ? point.confidence * 100 : point.confidence))))
          : null;
        const f = canvasStore.aiVisibilityFilter;
        if (pct !== null && pct >= 80 && !f.showConfident) return false;
        if (pct !== null && pct >= 50 && pct < 80 && !f.showReview) return false;
        if (pct !== null && pct < 50 && !f.showInspection) return false;
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

    annotationStore.updateAnnotationActive(clickedPoint, canvasStore.currentOpacity, canvasStore.currentSize);
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
        const isPixelCoord = annotation.isMappedFromSubImage || annotation.isSubImageAnnotation;
        const ax = isPixelCoord
          ? annotation.x * canvasStore.imageScale + canvasStore.imageDrawStartWidth
          : annotation.x;
        const ay = isPixelCoord
          ? annotation.y * canvasStore.imageScale + canvasStore.imageDrawStartHeight
          : annotation.y;
        const distance = Math.sqrt((x - ax) ** 2 + (y - ay) ** 2);
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
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.value.clientWidth;
  const cssHeight = canvas.value.clientHeight;

  if (!canvasStore.selectedImage || !cachedImage) return;

  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  if (zooming) {
    ctx.translate(canvasStore.offsetX*canvasStore.zoomScale - canvasStore.offsetZoomX, canvasStore.offsetY*canvasStore.zoomScale - canvasStore.offsetZoomY);
    ctx.scale(canvasStore.zoomScale, canvasStore.zoomScale);
  }

  const imgWidth = cachedImage.width;
  const imgHeight = cachedImage.height;
  const imgAspectRatio = imgWidth / imgHeight;
  const canvasAspectRatio = cssWidth / cssHeight;

  let drawWidth, drawHeight;

  if (imgAspectRatio > canvasAspectRatio) {
    drawWidth = cssWidth;
    drawHeight = cssWidth / imgAspectRatio;
  } else {
    drawHeight = cssHeight;
    drawWidth = cssHeight * imgAspectRatio;
  }

  const x = (cssWidth - drawWidth) / 2;
  const y = (cssHeight - drawHeight) / 2;

  canvasStore.imageDrawStartWidth = x;
  canvasStore.imageDrawStartHeight = y;
  canvasStore.imageScale = drawWidth / imgWidth;
  ctx.drawImage(cachedImage, x, y, drawWidth, drawHeight);

  annotationStore.annotations.forEach(point => {
    if (point.imageId !== canvasStore.selectedImage.imageId) return;
    if(point.type === 'AI') {
      const pct = Number.isFinite(point.confidence)
        ? Math.max(0, Math.min(100, Math.round((point.confidence <= 1 ? point.confidence * 100 : point.confidence))))
        : null;
      const f = canvasStore.aiVisibilityFilter;
      if (pct !== null && pct >= 80 && !f.showConfident) return;
      if (pct !== null && pct >= 50 && pct < 80 && !f.showReview) return;
      if (pct !== null && pct < 50 && !f.showInspection) return;
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
      // sub-image and mapped annotations store coords in pixel space — convert to canvas space
      const isPixelCoord = point.isMappedFromSubImage || point.isSubImageAnnotation;
      const px = isPixelCoord
        ? point.x * canvasStore.imageScale + canvasStore.imageDrawStartWidth
        : point.x;
      const py = isPixelCoord
        ? point.y * canvasStore.imageScale + canvasStore.imageDrawStartHeight
        : point.y;
      drawPoint(ctx, px, py, point.dyneinArmsValue, point.color, point.opacity, zooming ? point.size : point.size * canvasStore.zoomScale);
    }
  });

  ctx.restore();

  if (minimap && canvasStore.zoomScale > 1) {
    ctx.save();
    ctx.scale(dpr, dpr);
    drawMinimap(ctx);
    ctx.restore();
  }
};

const drawPoint = (ctx, x, y, dynein_arms, color, opacity, size) => {
  ctx.beginPath();
  size = size / canvasStore.zoomScale;
  ctx.arc(x, y, size, 0, 2 * Math.PI);
  ctx.fillStyle = applyOpacityToColor(color, opacity);
  ctx.fill();
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
      ? "#4CAF50"
      : confidencePct >= 50
        ? "#D4920A"
        : "#E05C3A";

  const rx1 = Math.round(x1);
  const ry1 = Math.round(y1);
  const rx2 = Math.round(x2);
  const ry2 = Math.round(y2);
  const width = rx2 - rx1;
  const height = ry2 - ry1;

  ctx.fillStyle = applyOpacityToColor(confidenceColor || color, 20);
  ctx.fillRect(rx1, ry1, width, height);

  ctx.strokeStyle = confidenceColor || color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(rx1 + lineWidth / 2, ry1 + lineWidth / 2, width - lineWidth, height - lineWidth);

  const markerColor = defectColor || color;
  const centerX = (rx1 + rx2) / 2;
  const centerY = (ry1 + ry2) / 2;
  const circleRadius = Math.max(4, Math.min(width, height) * 0.08);
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
  ctx.fillStyle = markerColor;
  ctx.fill();

  if (confidencePct !== null) {
    const confidenceLabel = confidencePct >= 80
      ? "High Confidence"
      : confidencePct >= 50
        ? "Needs Review"
        : "Needs Close Inspection";
    const labelFontSize = Math.max(10, Math.round((12 * size) / 7));
    const horizontalPadding = Math.max(6, Math.round((8 * size) / 7));
    const verticalPadding = Math.max(3, Math.round((5 * size) / 7));
    const labelHeight = labelFontSize + verticalPadding * 2;

    ctx.save();
    ctx.font = `600 ${labelFontSize}px -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.imageSmoothingEnabled = false;
    const labelWidth = Math.ceil(ctx.measureText(confidenceLabel).width) + horizontalPadding * 2;
    const labelX = Math.round(x1);
    const labelY = Math.round(Math.max(0, y1 - labelHeight));

    ctx.fillStyle = confidenceColor;
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.textRendering = "optimizeLegibility";
    ctx.fillText(confidenceLabel, Math.round(labelX + horizontalPadding), Math.round(labelY + labelHeight / 2));
    ctx.restore();
  }

  ctx.closePath();
};


const drawMinimap = (ctx) => {
  const minimapWidth = 200;
  const minimapHeight = 150;
  const cssWidth = canvas.value.clientWidth;
  const cssHeight = canvas.value.clientHeight;
  const minimapX = cssWidth - minimapWidth - 10;
  const minimapY = cssHeight - minimapHeight - 10;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);

  // Fit image into minimap preserving its actual aspect ratio
  const imgNativeWidth = cachedImage.width;
  const imgNativeHeight = cachedImage.height;
  const imgAspectRatio = imgNativeWidth / imgNativeHeight;
  const minimapAspectRatio = minimapWidth / minimapHeight;

  let drawWidth, drawHeight;
  if (imgAspectRatio > minimapAspectRatio) {
    drawWidth = minimapWidth;
    drawHeight = minimapWidth / imgAspectRatio;
  } else {
    drawHeight = minimapHeight;
    drawWidth = minimapHeight * imgAspectRatio;
  }

  // Center the image inside the minimap box
  const imgOffsetX = minimapX + (minimapWidth - drawWidth) / 2;
  const imgOffsetY = minimapY + (minimapHeight - drawHeight) / 2;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(cachedImage, imgOffsetX, imgOffsetY, drawWidth, drawHeight);
  ctx.restore();

  // --- Viewport indicator ---
  // Convert canvas viewport edges → image pixel space → minimap space
  const zoom = canvasStore.zoomScale;
  const ox = canvasStore.offsetX;
  const oy = canvasStore.offsetY;
  const ozx = canvasStore.offsetZoomX;
  const ozy = canvasStore.offsetZoomY;
  const imageStartX = canvasStore.imageDrawStartWidth;
  const imageStartY = canvasStore.imageDrawStartHeight;
  const imageScale = canvasStore.imageScale;

  // Canvas edge → zoomed-canvas space → image pixel space
  const toPx = (canvasEdge, startPx, zoom, offset, offsetZoom) =>
    ((canvasEdge - offset * zoom + offsetZoom) / zoom - startPx) / imageScale;

  const leftPx   = toPx(0,       imageStartX, zoom, ox, ozx);
  const rightPx  = toPx(cssWidth, imageStartX, zoom, ox, ozx);
  const topPx    = toPx(0,       imageStartY, zoom, oy, ozy);
  const bottomPx = toPx(cssHeight, imageStartY, zoom, oy, ozy);

  // Image pixel → minimap pixel
  const scaleX = drawWidth / imgNativeWidth;
  const scaleY = drawHeight / imgNativeHeight;

  const rectX = imgOffsetX + leftPx * scaleX;
  const rectY = imgOffsetY + topPx * scaleY;
  const rectW = (rightPx - leftPx) * scaleX;
  const rectH = (bottomPx - topPx) * scaleY;

  // Draw clipped to minimap bounds
  ctx.save();
  ctx.beginPath();
  ctx.rect(minimapX, minimapY, minimapWidth, minimapHeight);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rectX, rectY, rectW, rectH);
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

watch(() => canvasStore.aiVisibilityFilter, () => {
  drawImageWithPoints();
}, { deep: true });

watch(() => canvasStore.zoomScale, (newZoomScale) => {

  drawImageWithPoints();
});

watch(() => canvasStore.dragStartX, (newDragStartX) => {
  drawImageWithPoints();
});

watch(() => boardingStore.manualAnnotationTutorialOn, (newState) => {});

const handleDocumentClick = (e) => {
  if (!aiReviewPopup.value.visible) return;
  const popup = document.querySelector('.annotation-review-popup');
  if (popup && popup.contains(e.target)) return;
  if (canvas.value && canvas.value.contains(e.target)) return;
  closeAiReviewPopup();
};

onMounted(() => {
  window.addEventListener('scroll', closeAiReviewPopup);
  window.addEventListener('mousedown', handleDocumentClick);
  if (canvasStore.selectedImage) {
    drawImageOnCanvas(canvasStore.selectedImage.imageUrl);
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', closeAiReviewPopup);
  window.removeEventListener('mousedown', handleDocumentClick);
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

  canvasStore.offsetZoomX = (canvas.value.clientWidth * newZoomScale - canvas.value.clientWidth) / 2;
  canvasStore.offsetZoomY = (canvas.value.clientHeight * newZoomScale - canvas.value.clientHeight) / 2;
  canvasStore.setZoomScale(newZoomScale);

  drawImageWithPoints();
};

const startDragging = (event) => {
  if(event.button === 2) return;

  const { x , y } = getMousePosition(event);

  let clickedPoint = null;
  if (annotationStore.annotations.length > 0) {
    clickedPoint = annotationStore.annotations.find(point => {
      const isPixelCoord = point.isMappedFromSubImage || point.isSubImageAnnotation;
      const ax = isPixelCoord
        ? point.x * canvasStore.imageScale + canvasStore.imageDrawStartWidth
        : point.x;
      const ay = isPixelCoord
        ? point.y * canvasStore.imageScale + canvasStore.imageDrawStartHeight
        : point.y;
      return Math.sqrt((x - ax) ** 2 + (y - ay) ** 2) < 20 / canvasStore.zoomScale;
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
    const point = draggedPoint.value.point;
    const scale = canvasStore.imageScale;
    const isPixelCoord = point.isMappedFromSubImage || point.isSubImageAnnotation;

    if (isPixelCoord) {
      // Store as pixel coords
      point.x = (x - canvasStore.imageDrawStartWidth) / scale;
      point.y = (y - canvasStore.imageDrawStartHeight) / scale;
    } else {
      point.x = x;
      point.y = y;
    }

    const linked = annotationStore.getLinkedAnnotation(point);
    if (linked) {
      const crop = point.isSubImageAnnotation ? point.subImageCrop : linked.subImageCrop;
      if (crop) {
        if (point.isSubImageAnnotation) {
          // sub-image dragged → sync mapped (main image pixel = sub pixel * scale + crop)
          linked.x = point.x * 2 + crop.x;
          linked.y = point.y * 2 + crop.y;
        } else {
          // main image dragged → sync sub-image (sub pixel = (main pixel - crop) / scale)
          linked.x = (point.x - crop.x) / 2;
          linked.y = (point.y - crop.y) / 2;
        }
      }
    }

  } else {
  const newOffsetX = event.clientX - canvasStore.dragStartX;
  const newOffsetY = event.clientY - canvasStore.dragStartY;

  const imgWidth = cachedImage.width * canvasStore.zoomScale - canvasStore.offsetZoomX;
  const imgHeight = cachedImage.height * canvasStore.zoomScale - canvasStore.offsetZoomY;

  const minX = Math.min(0, canvas.value.clientWidth - imgWidth);
  const minY = Math.min(0, canvas.value.clientHeight - imgHeight);
  const maxX = Math.max(0, (imgWidth - canvas.value.clientWidth) / 2);
  const maxY = Math.max(0, (imgHeight - canvas.value.clientHeight) / 2);

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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
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

  const canvasWidth = canvas.value.clientWidth;
  const canvasHeight = canvas.value.clientHeight;
  const zoomFactor = 2;

  annotationStore.updateAnnotationActive(annotation, canvasStore.currentOpacity, canvasStore.currentSize);

  const newZoomScale = Math.min(
    canvasStore.maxScale,
    Math.max(canvasStore.minScale, zoomFactor)
  );

  canvasStore.offsetZoomX = (canvas.value.clientWidth * newZoomScale - canvas.value.clientWidth) / 2;
  canvasStore.offsetZoomY = (canvas.value.clientHeight * newZoomScale - canvas.value.clientHeight) / 2;

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
  width: 320px;
  background: #1a2540;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #ffffff;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px 16px;
}

.popup-title {
  font-size: 15px;
  letter-spacing: 1px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
}

.popup-confidence {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.confidence-high {
  background: #4CAF50;
  color: #ffffff;
}

.confidence-medium {
  background: #D4920A;
  color: #ffffff;
}

.confidence-low {
  background: #E05C3A;
  color: #ffffff;
}

.popup-body {
  padding: 16px 20px 20px;
}

.popup-label {
  font-size: 11px;
  letter-spacing: 1.2px;
  font-weight: 600;
  color: #8a96b0;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.popup-select-wrapper {
  display: flex;
}

.popup-defect-select {
  width: 100%;
  min-height: 42px;
  border-radius: 8px;
  border: 1px solid #2d3d60;
  background: #131f38;
  color: #d5dbe8;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  padding: 0 20px 20px;
  gap: 10px;
}

.popup-btn {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: opacity 0.15s;
}

.popup-btn:hover {
  opacity: 0.88;
}

.popup-btn-delete {
  background: #f07070;
}

.popup-btn-accept {
  background: #22c57a;
}

@media (max-width: 1024px) {
  .annotated-image {
      margin-top: 3.5%;
  }
}

</style>
