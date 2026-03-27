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
      this.manualCurrentStep = parseInt(localStorage.getItem('manualCurrentStep')) || 0;
      this.automaticAnnotationTutorialSeen = localStorage.getItem('automaticAnnotationTutorialSeen') === 'true';
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
      if (this.manualCurrentStep >= 9) this.setManualAnnotationTutorialOff();
    },

    setAutomaticAnnotationTutorialOn() {
      this.automaticAnnotationTutorialOn = true;
    },

    setAutomaticAnnotationTutorialOff() {
      this.automaticAnnotationTutorialOn = false;
      this.automaticAnnotationTutorialSeen = true;
      this.save();
    },

    setWelcome() {
      this.welcomeSeen = true;
      this.save();
    },
  },
});
