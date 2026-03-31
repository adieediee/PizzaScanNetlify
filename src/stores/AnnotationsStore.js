import { defineStore } from "pinia";
import { useStatisticStore } from "./StatisticStore";
import { useLoggingStore } from "./LoggStore";
import { useImageStore } from "./ImageStore";
import { useShortcutStore } from "./ShortcutStore";
import { useCanvasStore } from "./CanvasStore";
import { useFeedbackToastStore } from "./FeedbackToastStore";
import { v4 as uuidv4 } from "uuid";

export const useAnnotationStore = defineStore("annotation", {
  state: () => ({
    annotations: [],
    dyneinArms: [
      { name: "Unknown", value: "unknown", count: 0 },
      { name: "No arms missing", value: "no-arms-missing", count: 0 },
      { name: "Inner arms missing", value: "inner-arms-missing", count: 0 },
      { name: "Both arms missing", value: "both-arms-missing", count: 0 },
      { name: "Outer arms missing", value: "outer-arms-missing", count: 0 },
    ],
    microtubularDefects: [
      {
        name: "Normal",
        value: "normal",
        color: "#95F204",
        count: 0,
        description: "",
      },
      {
        name: "Missing center salami",
        value: "missing-center-salami",
        color: "#FF2D2D",
        count: 0,
        description: "",
      },
      {
        name: "Only one center salami",
        value: "one-center-salami",
        color: "#FF6B35",
        count: 0,
        description: "",
      },

      {
        name: "Extra salami",
        value: "extra-salami",
        color: "#C84BFF",
        count: 0,
        description: "",
      },
      {
        name: "Wrong slice count",
        value: "wrong-slices",
        color: "#FFA03B",
        count: 0,
        description: "",
      },
    ],
    /*dyneinArms: [ //pre layman testing
      { name: 'Neviem', value: 'unknown', count: 0},
      { name: 'Žiadna posýpka', value: 'no-arms-missing', count: 0},
      { name: 'Lentilky', value: 'inner-arms-missing', count: 0},
      { name: 'Farebné tyčinky', value: 'both-arms-missing', count: 0},
      { name: 'Čokoláda', value: 'outer-arms-missing', count: 0},
    ],*/
    /*microtubularDefects: [
      { name: 'Normal', value: 'normal', color: '#95F204', count: 0, description: ""},
      { name: 'Disarranged', value: 'disarranged', color: '#D9001B', count: 0, description: ""},
      { name: 'Extra tubule', value: 'extra-tuble', color: '#a11cff', count: 0, description: ""},
      { name: 'Single tubule', value: 'single-tuble', color: '#00FFFF', count: 0, description: ""},
      { name: 'Compound', value: 'compound', color: '#FF7ED5', count: 0, description: ""},
      { name: 'Transposition', value: 'transposition', color: '#FFFF00', count: 0, description: ""},
      { name: 'One of central pair missing', value: 'one-of-pair-missing', color: '#FFA03B', count: 0, description: ""},
      { name: 'Both missing', value: 'both-missing', color: '#0000FF', count: 0, description: ""},
      { name: 'Other defect', value: 'other-defect', color: '#8B4513', count: 0, description: ""},
    ],*/
    /*microtubularDefects: [ //pre layman testing
      { name: 'Vanilková', value: 'normal', color: '#95F204', count: 0},
      { name: 'Čokoládová', value: 'disarranged', color: '#D9001B', count: 0},
      { name: 'Red velvet', value: 'extra-tuble', color: '#a11cff', count: 0},
      { name: 'Oriešková', value: 'single-tuble', color: '#00FFFF', count: 0},
      { name: 'Iná', value: 'compound', color: '#FF7ED5', count: 0},
    ],*/
    loading: false,
    aiError: false,
    annotationHistory: [],
  }),
  actions: {
    addAnnotation(imageId, microtubularDefectValue, x, y, dyneinArmsValue) {
      const defectName = this.microtubularDefects.find(
        (defect) => defect.value === microtubularDefectValue,
      ).name;
      const dyneinName = this.dyneinArms.find(
        (arm) => arm.value === dyneinArmsValue,
      ).name;

      const annotation = {
        id: this.annotations.length + 1,
        imageId: imageId,
        microtubularDefect: defectName,
        microtubularDefectValue: microtubularDefectValue,
        dyneinArms: dyneinName,
        dyneinArmsValue: dyneinArmsValue,
        x: x,
        y: y,
        x1: null,
        y1: null,
        x2: null,
        y2: null,
        color: this.microtubularDefects.find(
          (defect) => defect.value === microtubularDefectValue,
        ).color,
        opacity: useCanvasStore().currentOpacity,
        size: useCanvasStore().currentSize,
        description: "",
        angle: "",
        distance: "",
        active: false,
        type: "manual",
      };
      this.annotations.push(annotation);

      this.microtubularDefects.find(
        (defect) => defect.value === microtubularDefectValue,
      ).count++;
      this.dyneinArms.find((arm) => arm.value === dyneinArmsValue).count++;

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action: "Annotation created",
        Annotation: {
          id: annotation.id,
          microtubularDefect: annotation.microtubularDefect,
          dyneinArms: annotation.dyneinArms,
          x: annotation.x,
          y: annotation.y,
          type: annotation.type,
          description: annotation.description,
        },
      });

      this.updateHistory("add", annotation);

      // Ak anotujeme sub-image, premapuj anotáciu na main image
      const imageStore = useImageStore();
      const activeSubImage = imageStore.activeSubImage;
      if (activeSubImage?.isSubImage && activeSubImage.mainPixelCenter) {
        const canvasStore = useCanvasStore();
        const scale = canvasStore.imageScale;

        // sub-image pixel space
        annotation.x = (x - canvasStore.imageDrawStartWidth) / scale;
        annotation.y = (y - canvasStore.imageDrawStartHeight) / scale;
        annotation.isSubImageAnnotation = true;
        annotation.subImageCrop = activeSubImage.crop;

        // main image: use JSON pixel center — same coords the bounding boxes use
        const linkedId = uuidv4();
        annotation.linkedAnnotationId = linkedId;

        const mappedAnnotation = {
          ...annotation,
          id: this.annotations.length + 1,
          imageId: activeSubImage.parentImageId,
          x: activeSubImage.mainPixelCenter.x,
          y: activeSubImage.mainPixelCenter.y,
          linkedAnnotationId: linkedId,
          isMappedFromSubImage: true,
          isSubImageAnnotation: false,
          sourceSubImageId: activeSubImage.imageId,
        };
        this.annotations.push(mappedAnnotation);
      }
    },

    getLinkedAnnotation(annotation) {
      if (!annotation.linkedAnnotationId) return null;
      return (
        this.annotations.find(
          (a) =>
            a.linkedAnnotationId === annotation.linkedAnnotationId &&
            a.id !== annotation.id,
        ) || null
      );
    },

    addAIannotation(imageId, microtubularDefectValue, x1, y1, x2, y2, subImageIndex) {
      const defectName = this.microtubularDefects.find(
        (defect) => defect.value === microtubularDefectValue,
      ).name;

      const annotation = {
        id: this.annotations.length + 1,
        imageId: imageId,
        microtubularDefect: defectName,
        microtubularDefectValue: microtubularDefectValue,
        dyneinArms: "Unknown",
        dyneinArmsValue: "unknown",
        x: null,
        y: null,
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        color: this.microtubularDefects.find(
          (defect) => defect.value === microtubularDefectValue,
        ).color,
        opacity: useCanvasStore().currentOpacity,
        size: useCanvasStore().currentSize,
        description: "",
        angle: "",
        distance: "",
        active: false,
        type: "AI",
      };
      this.annotations.push(annotation);

      this.microtubularDefects.find(
        (defect) => defect.value === microtubularDefectValue,
      ).count++;
      this.dyneinArms.find((arm) => arm.value === "unknown").count++;

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action: "AI annotation created",
        Annotation: {
          id: annotation.id,
          microtubularDefect: annotation.microtubularDefect,
          dyneinArms: annotation.dyneinArms,
          x: annotation.x,
          y: annotation.y,
          type: annotation.type,
          description: annotation.description,
        },
      });

      // If subImageIndex provided, create paired annotation at center of that sub-image
      if (subImageIndex !== undefined) {
        const imageStore = useImageStore();
        const mainImage = imageStore.uploadedImages.find((img) => img.imageId === imageId);
        const subImage = mainImage?.subImages?.[subImageIndex];
        if (subImage) {
          const linkedId = uuidv4();
          annotation.linkedAnnotationId = linkedId;

          // Place centered box using 10% margin in sub-image pixel space (1854×1854)
          const pngW = subImage.pngWidth ?? 1854;
          const pngH = subImage.pngHeight ?? 1854;
          const margin = Math.round(pngW * 0.1);

          const subAnnotation = {
            ...annotation,
            id: this.annotations.length + 1,
            imageId: subImage.imageId,
            x1: margin,
            y1: margin,
            x2: pngW - margin,
            y2: pngH - margin,
            linkedAnnotationId: linkedId,
            isSubImageAnnotation: true,
            subImageCrop: subImage.crop,
          };
          this.annotations.push(subAnnotation);
        }
      }

      return annotation;
    },

    getAnnotations(image) {
      return this.annotations.filter(
        (annotation) => annotation.imageId === image.imageId,
      );
    },

    updateDyneinArmsOnClick(index) {
      const prev_dynein_arms = this.annotations[index].dyneinArmsValue;
      const previousState = { ...this.annotations[index] };
      if (previousState.type === "AI") {
        useFeedbackToastStore().trackAIOverride(previousState.imageId, previousState.confidence);
      }

      const currentIndex = this.dyneinArms.findIndex(
        (arm) => arm.value === prev_dynein_arms,
      );
      const nextIndex = (currentIndex + 1) % this.dyneinArms.length;
      this.annotations[index].dyneinArms = this.dyneinArms[nextIndex].name;
      this.annotations[index].dyneinArmsValue =
        this.dyneinArms[nextIndex].value;

      const annotation = this.annotations[index];
      if (annotation.type === "AI") {
        annotation.x = (annotation.x1 + annotation.x2) / 2;
        annotation.y = (annotation.y1 + annotation.y2) / 2;
        annotation.x1 = null;
        annotation.y1 = null;
        annotation.x2 = null;
        annotation.y2 = null;
        annotation.type = "manual";
      }

      this.dyneinArms.find((arm) => arm.value === prev_dynein_arms).count--;
      if (
        this.dyneinArms.find((arm) => arm.value === prev_dynein_arms).count < 0
      )
        this.dyneinArms.find((arm) => arm.value === prev_dynein_arms).count = 0;
      this.dyneinArms.find(
        (arm) => arm.value === this.dyneinArms[nextIndex].value,
      ).count++;

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action:
          "Dynein arms updated: " +
          prev_dynein_arms +
          " -> " +
          this.dyneinArms[nextIndex].name,
        Annotation: {
          id: this.annotations[index].id,
          microtubularDefect: this.annotations[index].microtubularDefect,
          dyneinArms: this.annotations[index].dyneinArms,
          x: this.annotations[index].x,
          y: this.annotations[index].y,
          type: this.annotations[index].type,
          description: this.annotations[index].description,
        },
      });

      this.updateHistory("modify", this.annotations[index], previousState);

      const linked = this.getLinkedAnnotation(this.annotations[index]);
      if (linked) {
        linked.dyneinArms = this.annotations[index].dyneinArms;
        linked.dyneinArmsValue = this.annotations[index].dyneinArmsValue;
      }
    },

    deleteAllAnnotations() {
      const image = useImageStore().rightClickedImage;
      const imageId = image?.imageId;

      if (imageId === undefined) {
        console.error("Could not get image id");
        return;
      }

      const selectedAnnotationDeleted = this.annotations.find(
        (annotation) => annotation.imageId === imageId && annotation.active,
      );

      // Collect all imageIds to delete: parent + all sub-images
      const subImageIds = new Set((image.subImages || []).map(si => si.imageId));
      const allImageIds = new Set([imageId, ...subImageIds]);

      // Collect all linkedAnnotationIds from annotations being deleted
      const linkedIds = new Set(
        this.annotations
          .filter((a) => allImageIds.has(a.imageId) && a.linkedAnnotationId)
          .map((a) => a.linkedAnnotationId)
      );

      const toDelete = new Set(
        this.annotations
          .filter((a) => allImageIds.has(a.imageId) || linkedIds.has(a.linkedAnnotationId))
          .map((a) => a.id)
      );

      this.annotations.forEach((annotation) => {
        if (toDelete.has(annotation.id) && !annotation.isSubImageAnnotation) {
          const defect = this.microtubularDefects.find(
            (defect) => defect.value === annotation.microtubularDefectValue,
          );
          if (defect) defect.count--;
          const arm = this.dyneinArms.find(
            (arm) => arm.value === annotation.dyneinArmsValue,
          );
          if (arm) arm.count--;
        }
      });

      this.annotations = this.annotations.filter((a) => !toDelete.has(a.id));

      this.annotationHistory = [];

      // Reset aiAnnotated on parent and all sub-images
      const allImages = useImageStore().uploadedImages;
      allImages.filter((img) => allImageIds.has(img.imageId)).forEach((img) => {
        img.aiAnnotated = false;
      });

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action: "All annotations for image were deleted",
      });

      if (useImageStore().activeTab === "Annotation") {
        useImageStore().updateActiveTab("Image");
      }

      if (selectedAnnotationDeleted) {
        useImageStore().setSelectedAnnotation(null);
        useImageStore().setCroppedImage(null);
      }
    },

    deleteAIAnnotations() {
      const imageId = useImageStore().rightClickedImage.imageId;

      if (imageId === undefined) return;

      const aiAnnotations = this.annotations.filter(
        (annotation) =>
          annotation.imageId === imageId && annotation.type === "AI",
      );

      aiAnnotations.forEach((annotation) => {
        this.microtubularDefects.find(
          (defect) => defect.value === annotation.microtubularDefectValue,
        ).count--;
        this.dyneinArms.find((arm) => arm.value === annotation.dyneinArmsValue)
          .count--;
      });

      this.annotations = this.annotations.filter(
        (annotation) =>
          !(annotation.imageId === imageId && annotation.type === "AI"),
      );

      const image = useImageStore().uploadedImages.find((img) => img.imageId === imageId);
      if (image) image.aiAnnotated = false;

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action: "All AI annotations for image were deleted",
      });

      if (aiAnnotations.length > 0) {
        useImageStore().setSelectedAnnotation(null);
        useImageStore().setCroppedImage(null);

        if (useImageStore().activeTab === "Annotation") {
          useImageStore().updateActiveTab("Image");
        }
      }
    },

    acceptAllAIAnnotations(imageId) {
      const aiAnnotations = this.annotations.filter(
        (annotation) => annotation.imageId === imageId && annotation.type === "AI",
      );

      const convertToManual = (a) => {
        if (a.type !== "AI") return;
        a.x = (a.x1 + a.x2) / 2;
        a.y = (a.y1 + a.y2) / 2;
        a.x1 = null;
        a.y1 = null;
        a.x2 = null;
        a.y2 = null;
        a.type = "manual";
      };

      aiAnnotations.forEach((annotation) => {
        convertToManual(annotation);
        const linked = this.getLinkedAnnotation(annotation);
        if (linked) convertToManual(linked);
      });

      const image = useImageStore().uploadedImages.find((img) => img.imageId === imageId);
      if (image) image.aiAnnotated = true;

      useStatisticStore().computeStatistics(this.microtubularDefects, this.dyneinArms);
      useLoggingStore().logEvent({ Action: "All AI annotations accepted", Count: aiAnnotations.length });
    },

    updateAllAnnotationOpacities(opacity) {
      this.annotations.forEach((annotation) => {
        annotation.opacity = opacity;
      });
    },

    updateAllAnnotationSizes(size) {
      this.annotations.forEach((annotation) => {
        annotation.size = size;
      });
    },

    updateAnnotationDefect(id, defect_name) {
      const previousState = {
        ...this.annotations.find((annotation) => annotation.id === id),
      };
      if (previousState.type === "AI") {
        useFeedbackToastStore().trackAIOverride(previousState.imageId, previousState.confidence);
      }
      const prev_defect_name = this.annotations.find(
        (annotation) => annotation.id === id,
      ).microtubularDefectValue;
      this.microtubularDefects.find(
        (defect) => defect.value === prev_defect_name,
      ).count--;

      this.annotations.find(
        (annotation) => annotation.id === id,
      ).microtubularDefect = defect_name;
      this.annotations.find((annotation) => annotation.id === id).color =
        this.microtubularDefects.find(
          (defect) => defect.name === defect_name,
        ).color;

      const defect_value = this.microtubularDefects.find(
        (defect) => defect.name === defect_name,
      ).value;
      this.annotations.find(
        (annotation) => annotation.id === id,
      ).microtubularDefectValue = defect_value;
      this.microtubularDefects.find((defect) => defect.value === defect_value)
        .count++;

      const annotation = this.annotations.find(
        (annotation) => annotation.id === id,
      );
      if (annotation.type === "AI") {
        annotation.x = (annotation.x1 + annotation.x2) / 2;
        annotation.y = (annotation.y1 + annotation.y2) / 2;
        annotation.x1 = null;
        annotation.y1 = null;
        annotation.x2 = null;
        annotation.y2 = null;
        annotation.type = "manual";
      }

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action:
          "Microtubular defect updated: " +
          prev_defect_name +
          " -> " +
          defect_name,
        Annotation: {
          id: this.annotations.find((annotation) => annotation.id === id).id,
          microtubularDefect: this.annotations.find(
            (annotation) => annotation.id === id,
          ).microtubularDefect,
          dyneinArms: this.annotations.find(
            (annotation) => annotation.id === id,
          ).dyneinArms,
          x: this.annotations.find((annotation) => annotation.id === id).x,
          y: this.annotations.find((annotation) => annotation.id === id).y,
          type: this.annotations.find((annotation) => annotation.id === id)
            .type,
          description: this.annotations.find(
            (annotation) => annotation.id === id,
          ).description,
        },
      });

      const index = this.annotations.findIndex(
        (annotation) => annotation.id === id,
      );
      this.updateHistory("modify", this.annotations[index], previousState);

      const linked = this.getLinkedAnnotation(this.annotations[index]);
      if (linked) {
        linked.microtubularDefect = this.annotations[index].microtubularDefect;
        linked.microtubularDefectValue =
          this.annotations[index].microtubularDefectValue;
        linked.color = this.annotations[index].color;
        if (linked.type === "AI") {
          linked.x = (linked.x1 + linked.x2) / 2;
          linked.y = (linked.y1 + linked.y2) / 2;
          linked.x1 = null;
          linked.y1 = null;
          linked.x2 = null;
          linked.y2 = null;
          linked.type = "manual";
        }
      }
    },

    updateAnnotationArms(id, arms) {
      const previousState = {
        ...this.annotations.find((annotation) => annotation.id === id),
      };
      if (previousState.type === "AI") {
        useFeedbackToastStore().trackAIOverride(previousState.imageId, previousState.confidence);
      }
      const prev_arms = this.annotations.find(
        (annotation) => annotation.id === id,
      ).dyneinArmsValue;
      this.dyneinArms.find((arms) => arms.value === prev_arms).count--;

      const dynein_arm = this.dyneinArms.find((arm) => arm.value === arms);
      this.annotations.find((annotation) => annotation.id === id).dyneinArms =
        dynein_arm.name;
      this.annotations.find(
        (annotation) => annotation.id === id,
      ).dyneinArmsValue = dynein_arm.value;
      this.dyneinArms.find((arm) => arm.value === dynein_arm.value).count++;

      const annotation = this.annotations.find(
        (annotation) => annotation.id === id,
      );
      if (annotation.type === "AI") {
        annotation.x = (annotation.x1 + annotation.x2) / 2;
        annotation.y = (annotation.y1 + annotation.y2) / 2;
        annotation.x1 = null;
        annotation.y1 = null;
        annotation.x2 = null;
        annotation.y2 = null;
        annotation.type = "manual";
      }

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action: "Dynein arms updated: " + prev_arms + " -> " + arms,
        Annotation: {
          id: this.annotations.find((annotation) => annotation.id === id).id,
          microtubularDefect: this.annotations.find(
            (annotation) => annotation.id === id,
          ).microtubularDefect,
          dyneinArms: this.annotations.find(
            (annotation) => annotation.id === id,
          ).dyneinArms,
          x: this.annotations.find((annotation) => annotation.id === id).x,
          y: this.annotations.find((annotation) => annotation.id === id).y,
          type: this.annotations.find((annotation) => annotation.id === id)
            .type,
          description: this.annotations.find(
            (annotation) => annotation.id === id,
          ).description,
        },
      });

      const index = this.annotations.findIndex(
        (annotation) => annotation.id === id,
      );
      this.updateHistory("modify", this.annotations[index], previousState);

      const linked = this.getLinkedAnnotation(this.annotations[index]);
      if (linked) {
        linked.dyneinArms = this.annotations[index].dyneinArms;
        linked.dyneinArmsValue = this.annotations[index].dyneinArmsValue;
        if (linked.type === "AI") {
          linked.x = (linked.x1 + linked.x2) / 2;
          linked.y = (linked.y1 + linked.y2) / 2;
          linked.x1 = null;
          linked.y1 = null;
          linked.x2 = null;
          linked.y2 = null;
          linked.type = "manual";
        }
      }
    },

    updateAnnotationDescription(id, description) {
      const previousState = {
        ...this.annotations.find((annotation) => annotation.id === id),
      };
      this.annotations.find((annotation) => annotation.id === id).description =
        description;
      useLoggingStore().logEvent({
        Action: "Annotation description updated",
        Annotation: {
          id: this.annotations.find((annotation) => annotation.id === id).id,
          microtubularDefect: this.annotations.find(
            (annotation) => annotation.id === id,
          ).microtubularDefect,
          dyneinArms: this.annotations.find(
            (annotation) => annotation.id === id,
          ).dyneinArms,
          x: this.annotations.find((annotation) => annotation.id === id).x,
          y: this.annotations.find((annotation) => annotation.id === id).y,
          type: this.annotations.find((annotation) => annotation.id === id)
            .type,
          description: this.annotations.find(
            (annotation) => annotation.id === id,
          ).description,
        },
      });

      const index = this.annotations.findIndex(
        (annotation) => annotation.id === id,
      );
      this.updateHistory("modify", this.annotations[index], previousState);

      const linked = this.getLinkedAnnotation(this.annotations[index]);
      if (linked) linked.description = description;
    },

    updateAnnotationAngle(id, angle) {
      const previousState = {
        ...this.annotations.find((annotation) => annotation.id === id),
      };
      this.annotations.find((annotation) => annotation.id === id).angle = angle;
      useLoggingStore().logEvent({
        Action: "Annotation angle updated",
        Annotation: {
          id: this.annotations.find((annotation) => annotation.id === id).id,
          microtubularDefect: this.annotations.find(
            (annotation) => annotation.id === id,
          ).microtubularDefect,
          dyneinArms: this.annotations.find(
            (annotation) => annotation.id === id,
          ).dyneinArms,
          x: this.annotations.find((annotation) => annotation.id === id).x,
          y: this.annotations.find((annotation) => annotation.id === id).y,
          type: this.annotations.find((annotation) => annotation.id === id)
            .type,
          description: this.annotations.find(
            (annotation) => annotation.id === id,
          ).description,
        },
      });

      const index = this.annotations.findIndex(
        (annotation) => annotation.id === id,
      );
      this.updateHistory("modify", this.annotations[index], previousState);

      const linked = this.getLinkedAnnotation(this.annotations[index]);
      if (linked) linked.angle = angle;
    },

    updateAnnotationDistance(id, distance) {
      const previousState = {
        ...this.annotations.find((annotation) => annotation.id === id),
      };
      this.annotations.find((annotation) => annotation.id === id).distance =
        distance;
      useLoggingStore().logEvent({
        Action: "Annotation distance updated",
        Annotation: {
          id: this.annotations.find((annotation) => annotation.id === id).id,
          microtubularDefect: this.annotations.find(
            (annotation) => annotation.id === id,
          ).microtubularDefect,
          dyneinArms: this.annotations.find(
            (annotation) => annotation.id === id,
          ).dyneinArms,
          x: this.annotations.find((annotation) => annotation.id === id).x,
          y: this.annotations.find((annotation) => annotation.id === id).y,
          type: this.annotations.find((annotation) => annotation.id === id)
            .type,
          description: this.annotations.find(
            (annotation) => annotation.id === id,
          ).description,
        },
      });

      const index = this.annotations.findIndex(
        (annotation) => annotation.id === id,
      );
      this.updateHistory("modify", this.annotations[index], previousState);

      const linked = this.getLinkedAnnotation(this.annotations[index]);
      if (linked) linked.distance = distance;
    },

    updateAnnotationActive(annot, currentOpacity, currentSize) {
      this.annotations.forEach((annotation) => {
        annotation.active = false;
        annotation.opacity = currentOpacity;
        annotation.size = currentSize;
      });

      this.annotations.find((annotation) => annotation === annot).active = true;
      this.annotations.find((annotation) => annotation === annot).opacity = 100;
      this.annotations.find((annotation) => annotation === annot).size =
        currentSize + 5;

      useLoggingStore().logEvent({
        Action: "Annotation selected",
        Annotation: {
          id: this.annotations.find((annotation) => annotation === annot).id,
          microtubularDefect: this.annotations.find(
            (annotation) => annotation === annot,
          ).microtubularDefect,
          dyneinArms: this.annotations.find(
            (annotation) => annotation === annot,
          ).dyneinArms,
          x: this.annotations.find((annotation) => annotation === annot).x,
          y: this.annotations.find((annotation) => annotation === annot).y,
          type: this.annotations.find((annotation) => annotation === annot)
            .type,
          description: this.annotations.find(
            (annotation) => annotation === annot,
          ).description,
        },
      });
    },

    deleteAnnotation(annotation) {
      if (annotation.type === "AI") {
        useFeedbackToastStore().trackAIOverride(annotation.imageId, annotation.confidence);
      }

      const linked = this.getLinkedAnnotation(annotation);

      const toDelete = linked ? [annotation, linked] : [annotation];
      const idsToDelete = new Set(toDelete.map((a) => a.id));

      this.annotations = this.annotations.filter((a) => !idsToDelete.has(a.id));

      toDelete.filter((a) => !a.isSubImageAnnotation).forEach((a) => {
        this.microtubularDefects.find(
          (defect) => defect.value === a.microtubularDefectValue,
        ).count--;
        this.dyneinArms.find((arm) => arm.value === a.dyneinArmsValue).count--;
      });

      useStatisticStore().computeStatistics(
        this.microtubularDefects,
        this.dyneinArms,
      );
      useLoggingStore().logEvent({
        Action: "Annotation deleted",
        Annotation: {
          id: annotation.id,
          microtubularDefect: annotation.microtubularDefect,
          dyneinArms: annotation.dyneinArms,
          x: annotation.x,
          y: annotation.y,
          type: annotation.type,
          description: annotation.description,
        },
      });

      this.updateHistory("delete", annotation);
    },

    addNewClass(new_name, new_color, new_description) {
      this.microtubularDefects.push({
        name: new_name,
        value: new_name.toLowerCase().replace(/ /g, "-"),
        color: new_color,
        count: 0,
        description: new_description,
      });
      useLoggingStore().logEvent({
        Action: "New microtubular defect class added",
        "Defect class": {
          Name: new_name,
          Color: new_color,
          Description: new_description,
        },
      });
    },

    deleteClass(defect) {
      this.microtubularDefects.splice(
        this.microtubularDefects.indexOf(defect),
        1,
      );

      if (
        useImageStore().selectedAnnotation != null &&
        useImageStore().selectedAnnotation.microtubularDefectValue ===
          defect.value &&
        useImageStore().activeTab === "Annotation"
      ) {
        useImageStore().setSelectedAnnotation(null);
        useImageStore().updateActiveTab("Image");
      }

      this.annotations.forEach((annotation) => {
        if (annotation.microtubularDefectValue === defect.value) {
          this.dyneinArms.find(
            (arm) => arm.value === annotation.dyneinArmsValue,
          ).count--;
          this.annotations = this.annotations.filter(
            (annot) => annot.id !== annotation.id,
          );
        }
      });

      useLoggingStore().logEvent({
        Action: "Microtubular defect class deleted",
        "Defect class": {
          Name: defect.name,
          Color: defect.color,
        },
      });
    },

    updateClass(defect, name, color, description) {
      defect.name = name;
      defect.color = color;
      defect.description = description;

      this.annotations.forEach((annotation) => {
        if (annotation.microtubularDefectValue === defect.value) {
          annotation.microtubularDefect = name;
          annotation.color = color;
        }
      });

      useShortcutStore().deleteKeyBinding(defect.value);

      useLoggingStore().logEvent({
        Action: "Microtubular defect class updated",
        "Defect class": {
          Name: name,
          Color: color,
          Description: description,
        },
      });
    },

    updateHistory(action, annotation, previousState = null) {
      this.annotationHistory.push({ action, annotation, previousState });

      if (this.annotationHistory.length > 20) {
        this.annotationHistory.shift();
      }
    },

    undoLastAction() {
      if (this.annotationHistory.length === 0) return;

      const lastAction = this.annotationHistory.pop();

      if (lastAction.action === "add") {
        this.annotations.pop();
      } else if (lastAction.action === "delete") {
        this.annotations.push(lastAction.annotation);
      } else if (lastAction.action === "modify") {
        Object.assign(lastAction.annotation, lastAction.previousState);
      }
    },

    automaticAnnotation() {
      useImageStore().setRightClickedImage(useCanvasStore().selectedImage);
      this.deleteAIAnnotations();

      const image = useCanvasStore().selectedImage.imageId;

      this.loading = true;
      const randomDelay = Math.floor(Math.random() * (5 - 2 + 1)) + 2;
      setTimeout(() => {
        this.loading = false;
        if (useCanvasStore().selectedImage.imageName === "Tv9") {
          this.addAIannotation(image, "normal", 81, 256, 174, 345);
          this.addAIannotation(image, "transposition", 221, 323, 310, 404);
          this.addAIannotation(image, "normal", 414, 256, 507, 349);
          this.addAIannotation(image, "normal", 459, 20, 548, 116);
          this.addAIannotation(image, "normal", 563, 159, 683, 285);
          this.addAIannotation(image, "normal", 817, 171, 955, 281);
          this.addAIannotation(image, "normal", 768, 336, 895, 446);
          this.addAIannotation(image, "normal", 868, 470, 986, 569);
          this.addAIannotation(image, "normal", 861, 571, 965, 693);
          this.addAIannotation(image, "normal", 754, 568, 856, 685);
          this.addAIannotation(image, "normal", 597, 650, 705, 750);
          this.addAIannotation(image, "transposition", 341, 551, 434, 635);
          this.addAIannotation(image, "normal", 204, 582, 296, 669);
          this.addAIannotation(image, "compound", 567, 391, 693, 525); //mala by byt normal
        } else if (useCanvasStore().selectedImage.imageName === "Tv50") {
          this.addAIannotation(image, "normal", 256, 73, 351, 159);
          this.addAIannotation(image, "normal", 287, 201, 378, 280);
          this.addAIannotation(image, "normal", 419, 101, 508, 176);
          this.addAIannotation(image, "disarranged", 418, 222, 494, 300);
          this.addAIannotation(image, "normal", 599, 96, 683, 166);
          this.addAIannotation(image, "normal", 708, 107, 783, 194);
          this.addAIannotation(image, "normal", 549, 261, 635, 332);
          this.addAIannotation(image, "normal", 645, 233, 729, 297);
          this.addAIannotation(image, "normal", 716, 325, 827, 400);
          this.addAIannotation(image, "normal", 571, 344, 663, 404);
          this.addAIannotation(image, "normal", 457, 326, 535, 396);
          this.addAIannotation(image, "normal", 352, 297, 443, 371);
          this.addAIannotation(image, "both-missing", 256, 300, 338, 351);
          this.addAIannotation(image, "normal", 504, 413, 594, 486);
          this.addAIannotation(image, "normal", 585, 458, 668, 545);
          this.addAIannotation(image, "normal", 702, 449, 810, 533);
          this.addAIannotation(image, "normal", 470, 492, 568, 568);
          this.addAIannotation(image, "normal", 534, 547, 632, 627);
          this.addAIannotation(image, "normal", 668, 571, 769, 655);
          /*this.addAIannotation(image, "normal", 577, 632, 677, 719);
          this.addAIannotation(image, "normal", 389, 550, 479, 623);
          this.addAIannotation(image, "normal", 269, 553, 373, 637);
          this.addAIannotation(image, "normal", 154, 582, 278, 672);
          this.addAIannotation(image, "normal", 144, 502, 240, 585);
          this.addAIannotation(image, "normal", 238, 449, 337, 543);
          this.addAIannotation(image, "normal", 347, 469, 433, 546);
          this.addAIannotation(image, "normal", 77, 417, 180, 510);
          this.addAIannotation(image, "normal", 174, 353, 268, 455);
          this.addAIannotation(image, "normal", 279, 363, 364, 449);
          this.addAIannotation(image, "normal", 374, 381, 469, 465);
          this.addAIannotation(image, "normal", 528, 14, 622, 89);*/

          //zle defekty
          this.addAIannotation(image, "disarranged", 577, 632, 677, 719);
          this.addAIannotation(image, "disarranged", 389, 550, 479, 623);
          this.addAIannotation(image, "both-missing", 269, 553, 373, 637);

          //zle umiestnenie
          this.addAIannotation(image, "normal", 204, 632, 304, 719);
          this.addAIannotation(image, "normal", 194, 552, 290, 635);
          this.addAIannotation(image, "normal", 288, 499, 387, 593);

          //navyse
          this.addAIannotation(image, "normal", 800, 100, 900, 200);
        } else if (useCanvasStore().selectedImage.imageName === "Tv27") {
          this.addAIannotation(image, "normal", 157, 73, 297, 205);
          this.addAIannotation(image, "normal", 144, 219, 292, 326);
          //this.addAIannotation(image, "normal", 242, 340, 381, 456); //missing annotation
          this.addAIannotation(image, "normal", 72, 429, 219, 542);
          this.addAIannotation(image, "normal", 140, 553, 284, 664);
          this.addAIannotation(image, "normal", 328, 525, 464, 650);
          this.addAIannotation(image, "disarranged", 557, 590, 691, 719); //should be "normal"
          this.addAIannotation(image, "normal", 704, 452, 836, 579);
          this.addAIannotation(image, "normal", 816, 344, 970, 488);

          this.addAIannotation(image, "normal", 574, 221, 714, 355); //should be "other-defect"
          this.addAIannotation(image, "extra-tuble", 413, 217, 545, 340); //should be "normal"
          this.addAIannotation(image, "extra-tuble", 441, 367, 582, 488);

          this.addAIannotation(image, "normal", 899, 16, 955, 72); // redudant annotation, shouldnt be here

          /* correct annotations
          this.addAIannotation(image, "other-defect", 574, 221, 714, 355);
          this.addAIannotation(image, "normal", 413, 217, 545, 340);
          this.addAIannotation(image, "extra-tuble", 441, 367, 582, 488);*/
        } else if (useCanvasStore().selectedImage.imageName === "Tv11") {
          this.addAIannotation(image, "normal", 260, 45, 400, 187);
          this.addAIannotation(image, "normal", 360, 148, 480, 286);
          this.addAIannotation(image, "disarranged", 560, 54, 697, 193);
          this.addAIannotation(image, "normal", 792, 148, 956, 283);
          this.addAIannotation(image, "normal", 832, 359, 987, 514);
          this.addAIannotation(image, "normal", 727, 605, 865, 741);
          this.addAIannotation(image, "normal", 277, 419, 420, 556);
          this.addAIannotation(image, "normal", 92, 339, 234, 468); // should be "normal"
        }
      }, randomDelay * 1000);
    },
  },
});
