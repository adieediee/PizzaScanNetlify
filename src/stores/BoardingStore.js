import { defineStore } from 'pinia';

export const useBoardingStore = defineStore('boarding', {
  state: () => ({
    welcomeSeen: false,
    wholeTutorialSeen: false,
    explainNav: true,
    explainLeftBar: false,
    explainImage: false,
    explainRightBar: false,
    currentStep: 1,

    manualAnnotationTutorialOn: false,
    manualAnnotationTutorialSeen: false,
    manualCurrentStep: 0,

    automaticAnnotationTutorialOn: false,
    automaticAnnotationTutorialSeen: false,
    aiCurrentStep: 1,

    aiDetectionTutorialOn: false,
    aiDetectionTutorialSeen: false,
    aiDetectionCurrentStep: 1,
  }),

  getters: {
    showWelcomeModal: (state) => !state.welcomeSeen && !state.wholeTutorialSeen,
    showLayoutTutorial: (state) => state.welcomeSeen && !state.wholeTutorialSeen,
  },

  actions: {
    load() {
      this.wholeTutorialSeen = localStorage.getItem('wholeTutorialSeen') === 'true';
      const storedWelcome = localStorage.getItem('welcomeSeen');
      if (storedWelcome === null && this.wholeTutorialSeen) {
        this.welcomeSeen = true;
        localStorage.setItem('welcomeSeen', 'true');
      } else {
        this.welcomeSeen = storedWelcome === 'true';
      }
      this.manualAnnotationTutorialSeen = localStorage.getItem('manualAnnotationTutorialSeen') === 'true';
      this.currentStep = parseInt(localStorage.getItem('currentStep')) || 1;
      if (this.currentStep === 8) {
        this.currentStep = 7;
        this.save();
      }
      this.manualCurrentStep = parseInt(localStorage.getItem('manualCurrentStep')) || 0;
      this.automaticAnnotationTutorialSeen = localStorage.getItem('automaticAnnotationTutorialSeen') === 'true';
      this.aiDetectionTutorialSeen = localStorage.getItem('aiDetectionTutorialSeen') === 'true';
      this.explainNav = localStorage.getItem('explainNav') === 'false' ? false : true;
    },

    save() {
      localStorage.setItem('welcomeSeen', this.welcomeSeen);
      localStorage.setItem('wholeTutorialSeen', this.wholeTutorialSeen);
      localStorage.setItem('manualAnnotationTutorialSeen', this.manualAnnotationTutorialSeen);
      localStorage.setItem('explainNav', this.explainNav);
      localStorage.setItem('currentStep', this.currentStep);
      localStorage.setItem('manualCurrentStep', this.manualCurrentStep);
      localStorage.setItem('automaticAnnotationTutorialSeen', this.automaticAnnotationTutorialSeen);
      localStorage.setItem('aiDetectionTutorialSeen', this.aiDetectionTutorialSeen);
    },

    setCurrentStep(step) {
      this.currentStep = step;
      if (this.currentStep >= 1 && this.currentStep <= 4) {
        this.explainNav = true;
        this.explainLeftBar = false;
      } else if (this.currentStep == 5) {
        this.explainNav = false;
        this.explainLeftBar = true;
        this.explainImage = false;
      } else if (this.currentStep == 6) {
        this.explainLeftBar = false;
        this.explainImage = true;
        this.explainRightBar = false;
      } else if (this.currentStep == 7) {
        this.explainImage = false;
        this.explainRightBar = true;
      } else if (this.currentStep == 9) {
        this.explainRightBar = false;
        this.wholeTutorialSeen = true;
        this.save();
      }      
    },

    closeLayoutTutorial() {
      this.explainNav = false;
      this.explainLeftBar = false;
      this.explainImage = false;
      this.explainRightBar = false;
      this.wholeTutorialSeen = true;
      this.currentStep = 9;
      this.save();
    },

    closeManualAnnotationTutorial() {
      this.manualAnnotationTutorialOn = false;
      this.manualAnnotationTutorialSeen = true;
      this.save();
    },
    
    setManualAnnotationTutorialOn() {
      this.manualAnnotationTutorialOn = true;
      this.manualCurrentStep = 1;
    },

    setManualAnnotationTutorialOff() {
      this.manualAnnotationTutorialOn = false;
      this.manualAnnotationTutorialSeen = true;
      this.save();
    },

    setManualCurrentStep(step) {
      this.manualCurrentStep = step;
      if (this.manualCurrentStep >= 8) this.setManualAnnotationTutorialOff();
    },

    setAutomaticAnnotationTutorialOn() {
      this.automaticAnnotationTutorialOn = true;
      this.aiCurrentStep = 1;
    },

    setAutomaticAnnotationTutorialOff() {
      this.automaticAnnotationTutorialOn = false;
      this.automaticAnnotationTutorialSeen = true;
      this.save();
    },

    setAiCurrentStep(step) {
      this.aiCurrentStep = step;
      if (this.aiCurrentStep >= 6) {
        this.setAutomaticAnnotationTutorialOff();
      }
    },

    setAiDetectionTutorialOn() {
      this.aiDetectionTutorialOn = true;
      this.aiDetectionCurrentStep = 1;
    },

    setAiDetectionTutorialOff() {
      this.aiDetectionTutorialOn = false;
      this.aiDetectionTutorialSeen = true;
      this.save();
    },

    setAiDetectionCurrentStep(step) {
      this.aiDetectionCurrentStep = step;
      if (this.aiDetectionCurrentStep >= 6) this.setAiDetectionTutorialOff();
    },

    setWelcome() {
      this.welcomeSeen = true;
      this.save();
    },
  },
});
