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
      v-if="boardingStore.showLayoutTutorial && boardingStore.explainImage"
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
        <span class="popup-title">AI Suggestion</span>
        <span class="popup-badge" :class="getConfidenceClass(aiReviewPopup.annotation.confidence)">
          {{ formatConfidence(aiReviewPopup.annotation.confidence) }}
        </span>
      </div>
      <div class="popup-body">
        <span class="popup-section-label">Defect type</span>
        <div class="popup-dropdown" :class="{ open: popupDropdownOpen }">
          <div class="popup-dropdown-trigger" @click.stop="popupDropdownOpen = !popupDropdownOpen">
            <span class="popup-dot" :style="{ background: selectedPopupDefect?.color }"></span>
            <span class="popup-dropdown-value">{{ selectedPopupDefect?.name }}</span>
            <fa :icon="['fas', 'chevron-down']" class="popup-dropdown-chevron" />
          </div>
          <div v-if="popupDropdownOpen" class="popup-dropdown-list" @click.stop>
            <div
              v-for="defect in annotationStore.microtubularDefects"
              :key="defect.value"
              class="popup-dropdown-item"
              :class="{ active: defect.value === aiReviewPopup.annotation?.microtubularDefectValue }"
              @click.stop="handlePopupDefectSelect(defect)"
            >
              <span class="popup-dot" :style="{ background: defect.color }"></span>
              {{ defect.name }}
            </div>
          </div>
        </div>
      </div>
      <div class="popup-footer">
        <button class="popup-btn-delete" @click="deleteAiAnnotation">Delete</button>
        <button class="popup-btn-accept" @click="acceptAiAnnotation">Accept</button>
      </div>
    </div>

    <SubImageNavigation />

    <Transition name="micro-slide">
      <div
        v-if="feedbackToastStore.microToastVisible"
        class="micro-toast"
        @click="feedbackToastStore.dismissMicroToast()"
      >
        <fa :icon="['fas', 'circle-check']" class="micro-icon" />
        <span>Your correction has been noted — it helps improve future results.</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useCanvasStore } from '@/stores/CanvasStore';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useImageStore } from '@/stores/ImageStore';
import { useBoardingStore } from '@/stores/BoardingStore';
import { useFeedbackToastStore } from '@/stores/FeedbackToastStore';
import { useTrustCalibrationStore } from '@/stores/TrustCalibrationStore';
import { onMounted, watch, ref, computed, defineExpose, nextTick, onUnmounted } from 'vue';
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
const feedbackToastStore = useFeedbackToastStore();
const trustStore = useTrustCalibrationStore();

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

const popupDropdownOpen = ref(false);

const selectedPopupDefect = computed(() =>
  annotationStore.microtubularDefects.find(
    d => d.value === aiReviewPopup.value.annotation?.microtubularDefectValue
  )
);

const closeAiReviewPopup = () => {
  aiReviewPopup.value.visible = false;
  aiReviewPopup.value.annotation = null;
  popupDropdownOpen.value = false;
};

const handlePopupDefectSelect = (defect) => {
  const popupAnnotation = aiReviewPopup.value.annotation;
  if (!popupAnnotation) return;
  annotationStore.updateAnnotationDefect(popupAnnotation.id, defect.name);
  popupAnnotation.defectColor = defect.color;
  popupDropdownOpen.value = false;
  closeAiReviewPopup();
};

const acceptAiAnnotation = () => {
  const annotation = aiReviewPopup.value.annotation;
  if (annotation) {
    const convertToManual = (a) => {
      if (a.type !== 'AI') return;
      a.x = (a.x1 + a.x2) / 2;
      a.y = (a.y1 + a.y2) / 2;
      a.x1 = null;
      a.y1 = null;
      a.x2 = null;
      a.y2 = null;
      a.type = 'manual';
    };
    convertToManual(annotation);
    const linked = annotationStore.getLinkedAnnotation(annotation);
    if (linked) convertToManual(linked);
    drawImageWithPoints();
    console.log('[Trust] acceptAiAnnotation called');
    trustStore.recordAccept();
  }
  aiReviewPopup.value.visible = false;
  aiReviewPopup.value.annotation = null;
};

const deleteAiAnnotation = () => {
  const annotation = aiReviewPopup.value.annotation;
  if (annotation) {
    trustStore.recordDecline(normalizeConfidence(annotation.confidence));
    annotationStore.deleteAnnotation(annotation);
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
  if (confidenceValue >= 80) return "Likely correct";
  if (confidenceValue >= 50) return "Needs check";
  return "May need correction";
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
  feedbackToastStore.setAiPopupAnchor(left, top);
};

const handlePopupDefectTypeChange = (event) => {
  const selectedDefectValue = event.target.value;
  const popupAnnotation = aiReviewPopup.value.annotation;
  if (!popupAnnotation) return;

  const selectedDefect = annotationStore.microtubularDefects.find(
    (defect) => defect.value === selectedDefectValue
  );
  if (!selectedDefect) return;

  // updateAnnotationDefect handles feedback tracking, sync to linked, and AI→manual conversion
  annotationStore.updateAnnotationDefect(popupAnnotation.id, selectedDefect.name);
  popupAnnotation.defectColor = selectedDefect.color;
  closeAiReviewPopup();
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
        const bx1 = point.isSubImageAnnotation ? point.x1 * canvasStore.imageScale + canvasStore.imageDrawStartWidth : point.x1;
        const by1 = point.isSubImageAnnotation ? point.y1 * canvasStore.imageScale + canvasStore.imageDrawStartHeight : point.y1;
        const bx2 = point.isSubImageAnnotation ? point.x2 * canvasStore.imageScale + canvasStore.imageDrawStartWidth : point.x2;
        const by2 = point.isSubImageAnnotation ? point.y2 * canvasStore.imageScale + canvasStore.imageDrawStartHeight : point.y2;
        return x >= bx1 && x <= bx2 && y >= by1 && y <= by2;
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
        const bx1 = annotation.isSubImageAnnotation ? annotation.x1 * canvasStore.imageScale + canvasStore.imageDrawStartWidth : annotation.x1;
        const by1 = annotation.isSubImageAnnotation ? annotation.y1 * canvasStore.imageScale + canvasStore.imageDrawStartHeight : annotation.y1;
        const bx2 = annotation.isSubImageAnnotation ? annotation.x2 * canvasStore.imageScale + canvasStore.imageDrawStartWidth : annotation.x2;
        const by2 = annotation.isSubImageAnnotation ? annotation.y2 * canvasStore.imageScale + canvasStore.imageDrawStartHeight : annotation.y2;
        return x >= bx1 && x <= bx2 && y >= by1 && y <= by2;
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
  ctx.globalAlpha = canvasStore.imageOpacity / 100;
  ctx.drawImage(cachedImage, x, y, drawWidth, drawHeight);
  ctx.globalAlpha = 1;

  annotationStore.annotations.forEach(point => {
    if (point.imageId !== canvasStore.selectedImage.imageId) return;
    if(point.type === 'AI') {
      const pct = Number.isFinite(point.confidence)
        ? Math.max(0, Math.min(100, Math.round((point.confidence <= 1 ? point.confidence * 100 : point.confidence))))
        : null;
      const f = canvasStore.aiVisibilityFilter;
      const hideBbox =
        (pct !== null && pct >= 80 && !f.showConfident) ||
        (pct !== null && pct >= 50 && pct < 80 && !f.showReview) ||
        (pct !== null && pct < 50 && !f.showInspection);

      let ax1 = point.x1, ay1 = point.y1, ax2 = point.x2, ay2 = point.y2;
      if (point.isSubImageAnnotation) {
        ax1 = point.x1 * canvasStore.imageScale + canvasStore.imageDrawStartWidth;
        ay1 = point.y1 * canvasStore.imageScale + canvasStore.imageDrawStartHeight;
        ax2 = point.x2 * canvasStore.imageScale + canvasStore.imageDrawStartWidth;
        ay2 = point.y2 * canvasStore.imageScale + canvasStore.imageDrawStartHeight;
      }

      if (hideBbox) {
        const cx = (ax1 + ax2) / 2;
        const cy = (ay1 + ay2) / 2;
        drawPoint(ctx, cx, cy, point.dyneinArmsValue, point.defectColor || point.color, point.opacity, zooming ? point.size : point.size * canvasStore.zoomScale);
        return;
      }

      drawAIPoint(
        ctx,
        ax1,
        ay1,
        ax2,
        ay2,
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
      ? "Likely correct"
      : confidencePct >= 50
        ? "Needs check"
        : "May need correction";
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

watch(() => canvasStore.imageOpacity, () => {
  drawImageWithPoints();
});

watch(() => canvasStore.currentSize, (newSize) => {
  annotationStore.updateAllAnnotationSizes(newSize);
  drawImageWithPoints();
});

watch(() => annotationStore.annotations, (newAnnotations) => {
  drawImageWithPoints();
}, { deep: true });

let microTimer = null;
watch(() => feedbackToastStore.microToastVisible, (visible) => {
  if (visible) {
    clearTimeout(microTimer);
    microTimer = setTimeout(() => feedbackToastStore.dismissMicroToast(), 3500);
  }
});

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

    // Drag sync: linked annotations share position
    // Sub-image annotation (isSubImageAnnotation) stores pixel coords; mapped stores canvas coords.
    // We only sync when dragging the sub-image side — the mapped annotation keeps its canvas coords
    // (it was placed at the AI bbox center which is the correct reference point).
    // Dragging the main-image side does NOT move the sub-image annotation (position is approximate anyway).
    const linked = annotationStore.getLinkedAnnotation(point);
    if (linked && point.isSubImageAnnotation) {
      // Sub-image dragged: move linked (canvas coords) by the same canvas delta
      // Linked is in canvas space — we don't have a reliable inverse formula, so skip for now
      // All attribute changes (defect, dynein, etc.) still sync via linkedAnnotationId
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
.micro-toast {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(22, 30, 54, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(85, 204, 130, 0.3);
  border-radius: 10px;
  color: #90e8b0;
  font-size: 0.78rem;
  z-index: 100;
  cursor: pointer;
  max-width: 320px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  pointer-events: all;
}

.micro-icon {
  font-size: 0.85rem;
  flex-shrink: 0;
  color: #55cc88;
}

.micro-slide-enter-active {
  animation: micro-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.micro-slide-leave-active {
  animation: micro-out 0.2s ease both;
}
@keyframes micro-in {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes micro-out {
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(8px); opacity: 0; }
}

.annotated-image {
  position: relative;
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
  width: 310px;
  background: #1c1c2e;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  color: #ffffff;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.popup-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffffff;
}

.popup-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.confidence-high   { color: #4CAF50; background: rgba(76, 175, 80, 0.15); border: 1px solid rgba(76, 175, 80, 0.3); }
.confidence-medium { color: #D4920A; background: rgba(212, 146, 10, 0.15); border: 1px solid rgba(212, 146, 10, 0.3); }
.confidence-low    { color: #E05C3A; background: rgba(224, 92, 58, 0.15); border: 1px solid rgba(224, 92, 58, 0.3); }

.popup-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.popup-section-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
}

.popup-dropdown {
  position: relative;
  width: 100%;
}

.popup-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s;
  user-select: none;
}

.popup-dropdown-trigger:hover,
.popup-dropdown.open .popup-dropdown-trigger {
  border-color: rgba(255, 255, 255, 0.22);
}

.popup-dropdown-value {
  flex: 1;
}

.popup-dropdown-chevron {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.35);
  transition: transform 0.15s;
}

.popup-dropdown.open .popup-dropdown-chevron {
  transform: rotate(180deg);
}

.popup-dropdown-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #252538;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.popup-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: background 0.1s;
}

.popup-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.07);
}

.popup-dropdown-item.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.popup-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.popup-footer {
  display: flex;
  gap: 8px;
}

.popup-btn-delete,
.popup-btn-accept {
  flex: 1;
  border: none;
  border-radius: 8px;
  padding: 9px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.popup-btn-delete:hover,
.popup-btn-accept:hover {
  opacity: 0.85;
}

.popup-btn-delete {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.popup-btn-delete:hover {
  color: #E05C3A;
  background: rgba(224, 92, 58, 0.12);
  border-color: rgba(224, 92, 58, 0.25);
  opacity: 1;
}

.popup-btn-accept {
  background: #3E63DD;
  color: #ffffff;
}

@media (max-width: 1024px) {
  .annotated-image {
      margin-top: 3.5%;
  }
}

</style>
