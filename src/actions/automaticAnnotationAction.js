import squareAnnotations from "./automaticAnnotationSquares.json";
import subImageMap from "./pizzaSubImageMap.json";
import { v4 as uuidv4 } from "uuid";

const PIZZA_SUB_IMAGE_COUNT = 8;

const loadPizzaSubImages = (imageStore, canvasStore) => {
  if (!canvasStore.selectedImage) return;

  const parentImageId = canvasStore.selectedImage.imageId;
  const subImages = Array.from({ length: PIZZA_SUB_IMAGE_COUNT }, (_, i) => {
    const name = `pizza-${i + 1}`;
    const crop = subImageMap.find((m) => m.name === name) || null;
    return {
      imageName: name,
      imageUrl: `/${name}.png`,
      imageId: uuidv4(),
      isSubImage: true,
      parentImageId,
      subImageIndex: i,
      crop,
    };
  });

  imageStore.addSubImages(parentImageId, subImages);
};

const normalizeSquare = (square) => {
  if (!square) return null;

  const x1 = Number(square.x1);
  const y1 = Number(square.y1);
  const x2 = Number(square.x2);
  const y2 = Number(square.y2);

  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
    confidence: Number(square.confidence),
    defectType: square.defectType || "normal",
  };
};

const addSquaresFromJson = (annotationStore, canvasStore) => {
  if (!canvasStore.selectedImage) return;

  const imageId = canvasStore.selectedImage.imageId;

  if (canvasStore.selectedImage.aiAnnotated) return;

  canvasStore.selectedImage.aiAnnotated = true;

  squareAnnotations.forEach((square) => {
    const parsedSquare = normalizeSquare(square);
    if (!parsedSquare) return;

    const { x1, y1, x2, y2, defectType, confidence } = parsedSquare;

    const scale = canvasStore.imageScale;
    const offsetX = canvasStore.imageDrawStartWidth;
    const offsetY = canvasStore.imageDrawStartHeight;

    const cx1 = x1 * scale + offsetX;
    const cy1 = y1 * scale + offsetY;
    const cx2 = x2 * scale + offsetX;
    const cy2 = y2 * scale + offsetY;

    annotationStore.addAIannotation(imageId, defectType, cx1, cy1, cx2, cy2);

    const createdAnnotation = annotationStore.annotations[annotationStore.annotations.length - 1];
    if (createdAnnotation) {
      createdAnnotation.confidence = Number.isFinite(confidence) ? confidence : null;
      createdAnnotation.defectColor =
        annotationStore.microtubularDefects.find((defect) => defect.value === defectType)?.color ||
        createdAnnotation.color;
    }
  });
};

export const createAutomaticAnnotationHandler = (boardingStore, annotationStore, canvasStore) => {
  return () => {
    if (!boardingStore.automaticAnnotationTutorialSeen) {
      boardingStore.setAutomaticAnnotationTutorialOn();
    } else {
      annotationStore.automaticAnnotation();
    }

    addSquaresFromJson(annotationStore, canvasStore);
  };
};

export const createAIDetectionHandler = (imageStore, canvasStore, boardingStore) => {
  return () => {
    loadPizzaSubImages(imageStore, canvasStore);
    if (!boardingStore.aiDetectionTutorialSeen) {
      boardingStore.setAiDetectionTutorialOn();
    }
  };
};
