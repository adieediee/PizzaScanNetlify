import { defineStore } from 'pinia'

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    selectedImage: null,
    canvasWidth: 0,
    canvasHeight: 0,
    isMouseDown: false,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    offsetX: 0,
    offsetY: 0,
    zoomScale: 1,
    offsetZoomX: 0,
    offsetZoomY: 0,
    maxScale: 10,
    minScale: 1,
    selectedAnnotationColor: '#95F204',
    selectedAnnotationType: 'normal',
    currentOpacity: 100,
    currentSize: 7,
    imageOpacity: 75,
    activeZoom: false,
    activeDragging: false,
    activeAnnotation: false,
    imageDrawStartWidth: 0,
    imageDrawStartHeight: 0,
    imageScale: 1,
    aiVisibilityFilter: {
      showConfident: false,
      showReview: true,
      showInspection: true,
    },
  }),

  actions: {
    setImage(image) {
      
      this.selectedImage = image;
      if(image === null) {
        this.activeAnnotation = false;
      } else {
        this.activeAnnotation = true;
      }
    },

    updateCanvasSize(width, height) {
      this.canvasWidth = width;
      this.canvasHeight = height;
    },

    setZoomScale(scale) {
      this.zoomScale = scale;
    },

    setAnnotationColor(color) {
      this.selectedAnnotationColor = color;
    },

    setAnnotationType(type) {
      this.selectedAnnotationType = type;
    },

    setOpacity(opacity) {
      this.currentOpacity = opacity;
    },

    setImageOpacity(opacity) {
      this.imageOpacity = opacity;
    },

    setSize(size) {
      this.currentSize = size;
    },

    centerImage() {
      this.offsetX = 0;
      this.offsetY = 0;
      this.zoomScale = 1;
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.offsetZoomX = 0;
      this.offsetZoomY = 0;
    },
    
    setActiveTool(tool) {
      if (tool === 'zoom') {
        this.activeZoom = true;
        this.activeDragging = false;
        this.activeAnnotation = false;
      } else if (tool === 'dragging') {
        this.activeDragging = true;
        this.activeZoom = false;
        this.activeAnnotation = false;
      } else if(tool === 'annotation') {
        this.activeAnnotation = true;
        this.activeDragging = false;
        this.activeZoom = false;
      }
    },
  }
});