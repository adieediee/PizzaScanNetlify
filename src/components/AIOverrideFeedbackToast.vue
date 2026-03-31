<template>
  <Transition name="toast-slide">
    <div
      v-if="toastStore.visible"
      class="feedback-toast"
      :style="toastStyle"
      role="dialog"
      aria-label="Quick feedback"
      @click.stop
    >
      <div class="toast-glow" aria-hidden="true"></div>

      <template v-if="thanksMode">
        <div class="thanks-body">
          <fa :icon="['fas', 'circle-check']" class="thanks-icon" />
          <div>
            <div class="toast-title">{{ $t('modals.reportProblem.thanksTitle') }}</div>
            <p class="thanks-text">{{ $t('modals.reportProblem.thanksBody') }}</p>
          </div>
        </div>
        <div class="toast-timer">
          <div class="timer-bar" :style="{ width: thanksPct + '%' }"></div>
        </div>
      </template>

      <template v-else>
        <div class="toast-header">
          <span class="toast-title">Why did you override the AI?</span>
          <button class="toast-close" @click="skip" aria-label="Close">
            <fa :icon="['fas', 'xmark']" />
          </button>
        </div>

        <div class="toast-options">
          <button
            v-for="opt in PRESET_OPTIONS"
            :key="opt"
            class="option-btn"
            :class="{ selected: selectedReason === opt }"
            @click="selectReason(opt)"
          >
            <span class="option-radio">
              <span class="option-radio-inner" v-if="selectedReason === opt" />
            </span>
            {{ opt }}
          </button>

          <div class="option-btn other-option" :class="{ selected: otherActive }">
            <span class="option-radio">
              <span class="option-radio-inner" v-if="otherActive" />
            </span>
            <input
              ref="otherInputRef"
              v-model="otherText"
              class="other-input"
              placeholder="Other reason..."
              maxlength="200"
              @focus="onOtherFocus"
              @input="onOtherInput"
            />
          </div>
        </div>

        <div v-if="!timerStopped" class="toast-timer">
          <div class="timer-bar" :style="{ width: timerPct + '%' }"></div>
        </div>

        <div class="toast-actions">
          <button class="btn-skip" @click="skip">Skip</button>
          <button class="btn-submit" :disabled="!canSubmit" @click="submit">Submit</button>
        </div>
      </template>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { useFeedbackToastStore } from '@/stores/FeedbackToastStore';
import { useLoggingStore } from '@/stores/LoggStore';
import { useCanvasStore } from '@/stores/CanvasStore';

const GAP = 16;

const PRESET_OPTIONS = [
  'Bad image quality',
  'AI keeps making the same mistake',
];

const toastStore = useFeedbackToastStore();
const loggingStore = useLoggingStore();
const canvasStore = useCanvasStore();

const TIMER_DURATION = 15000;
const TIMER_STEP = 100;
const THANKS_DURATION = 3000;

const selectedReason = ref(null);
const otherText = ref('');
const otherInputRef = ref(null);
const toastRight = ref(GAP);
const toastBottom = ref(GAP);
const timerPct = ref(100);
const timerStopped = ref(false);
const thanksMode = ref(false);
const thanksPct = ref(100);
let dismissTimer = null;
let timerInterval = null;
let thanksTimer = null;
let thanksInterval = null;

const otherActive = computed(() => otherText.value.trim().length > 0 || (selectedReason.value === null && document.activeElement === otherInputRef.value));

const canSubmit = computed(() => selectedReason.value !== null || otherText.value.trim().length > 0);

const toastStyle = computed(() => ({
  right: `${toastRight.value}px`,
  bottom: `${toastBottom.value}px`,
}));

function computePosition() {
  const sidebar = document.getElementById('rightSidebar');
  if (sidebar) {
    const sidebarRect = sidebar.getBoundingClientRect();
    toastRight.value = window.innerWidth - sidebarRect.left + GAP;
  } else {
    toastRight.value = GAP;
  }
  toastBottom.value = GAP;
}

function startTimer() {
  timerPct.value = 100;
  timerStopped.value = false;
  let elapsed = 0;
  timerInterval = setInterval(() => {
    elapsed += TIMER_STEP;
    timerPct.value = Math.max(0, 100 - (elapsed / TIMER_DURATION) * 100);
  }, TIMER_STEP);
  dismissTimer = setTimeout(() => skip(), TIMER_DURATION);
}

function stopTimer() {
  clearTimeout(dismissTimer);
  clearInterval(timerInterval);
  dismissTimer = null;
  timerInterval = null;
}

function selectReason(reason) {
  selectedReason.value = selectedReason.value === reason ? null : reason;
  otherText.value = '';
}

function onOtherFocus() {
  selectedReason.value = null;
  if (!timerStopped.value) {
    stopTimer();
    timerStopped.value = true;
  }
}

function onOtherInput() {
  if (otherText.value.length > 0) {
    selectedReason.value = null;
  }
}

function resetState() {
  selectedReason.value = null;
  otherText.value = '';
  timerPct.value = 100;
  timerStopped.value = false;
  thanksMode.value = false;
  thanksPct.value = 100;
  stopTimer();
  clearTimeout(thanksTimer);
  clearInterval(thanksInterval);
  thanksTimer = null;
  thanksInterval = null;
}

function skip() {
  stopTimer();
  toastStore.dismiss();
  resetState();
}

function submit() {
  stopTimer();
  const reason = otherText.value.trim() || selectedReason.value;
  loggingStore.submitOverrideFeedback(reason, null, toastStore.currentImageId);
  selectedReason.value = null;
  otherText.value = '';
  timerStopped.value = false;
  thanksMode.value = true;
  thanksPct.value = 100;
  let elapsed = 0;
  thanksInterval = setInterval(() => {
    elapsed += TIMER_STEP;
    thanksPct.value = Math.max(0, 100 - (elapsed / THANKS_DURATION) * 100);
  }, TIMER_STEP);
  thanksTimer = setTimeout(() => {
    toastStore.dismiss();
    resetState();
  }, THANKS_DURATION);
}

watch(() => toastStore.visible, (visible) => {
  if (visible) {
    nextTick(() => {
      computePosition();
      startTimer();
    });
  } else {
    resetState();
  }
});


onUnmounted(() => {
  stopTimer();
  clearTimeout(thanksTimer);
  clearInterval(thanksInterval);
});

// Dismiss toast when navigating to a different image
watch(() => canvasStore.selectedImage?.imageId, (newId, oldId) => {
  if (oldId && newId !== oldId && toastStore.visible) {
    skip();
  }
});
</script>

<style scoped>
.micro-toast {
  position: fixed;
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
  z-index: 1001;
  cursor: pointer;
  max-width: 320px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
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

.thanks-body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.thanks-icon {
  font-size: 1.2rem;
  color: #55cc88;
  flex-shrink: 0;
  margin-top: 2px;
}

.thanks-text {
  margin: 4px 0 0;
  font-size: 0.76rem;
  color: #9090b8;
  line-height: 1.4;
}

.feedback-toast {
  position: fixed;
  width: 300px;
  background: rgba(22, 30, 54, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(85, 102, 204, 0.25);
  border-radius: 16px;
  padding: 16px;
  z-index: 1001;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.04) inset;
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* right + bottom set dynamically via :style */
}

.toast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toast-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #e0e0ff;
  letter-spacing: 0.02em;
}

.toast-close {
  background: none;
  border: none;
  color: #6a6a9a;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.8rem;
  line-height: 1;
}

.toast-close:hover {
  color: #c0c0e0;
}

.toast-options {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid #2d3a5c;
  background: #111828;
  color: #9090b8;
  font-size: 0.78rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.option-btn:hover {
  border-color: #4a5a8c;
  color: #c0c0e0;
  background: #161e30;
}

.option-btn.selected {
  border-color: #5566cc;
  background: #1e2a4a;
  color: #d8d8ff;
}

.option-radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #4a5a8c;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.option-btn.selected .option-radio {
  border-color: #5566cc;
  box-shadow: 0 0 0 3px rgba(85, 102, 204, 0.18);
}

.option-radio-inner {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5566cc;
  animation: radio-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes radio-pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.other-option {
  padding: 8px 12px;
}

.other-input {
  background: none;
  border: none;
  outline: none;
  color: #c0c0e0;
  font-size: 0.78rem;
  width: 100%;
  font-family: inherit;
}

.other-input::placeholder {
  color: #4a4a70;
}

.toast-timer {
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.timer-bar {
  height: 100%;
  background: rgba(85, 102, 204, 0.6);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.toast-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-skip {
  background: none;
  border: 1px solid #2d3a5c;
  color: #6a6a9a;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
}

.btn-skip:hover {
  border-color: #4a5a8c;
  color: #a0a0c8;
}

.btn-submit {
  background: #1e2a4a;
  border: 1px solid #5566cc;
  color: #c0c0ff;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background: #28367a;
}

.btn-submit:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toast-slide-enter-active {
  animation: toast-enter 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.toast-slide-leave-active {
  animation: toast-leave 0.22s cubic-bezier(0.4, 0, 1, 1) both;
}

/* stagger children on enter */
.toast-slide-enter-active .toast-header {
  animation: toast-child-in 0.35s ease-out 0.08s both;
}
.toast-slide-enter-active .toast-options {
  animation: toast-child-in 0.35s ease-out 0.14s both;
}
.toast-slide-enter-active .toast-actions {
  animation: toast-child-in 0.35s ease-out 0.2s both;
}

@keyframes toast-enter {
  from {
    transform: translateX(24px) translateY(10px) scale(0.92);
    opacity: 0;
    filter: blur(3px);
  }
  to {
    transform: translateX(0) translateY(0) scale(1);
    opacity: 1;
    filter: blur(0);
  }
}

@keyframes toast-leave {
  from {
    transform: translateX(0) scale(1);
    opacity: 1;
    filter: blur(0);
  }
  to {
    transform: translateX(18px) scale(0.95);
    opacity: 0;
    filter: blur(2px);
  }
}

@keyframes toast-child-in {
  from {
    transform: translateY(6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* one-time glow pulse — on child so Vue doesn't pick up the long duration for leave */
.toast-glow {
  position: absolute;
  inset: -1px;
  border-radius: 17px;
  pointer-events: none;
  animation: border-pulse 1.4s ease-out 0.5s both;
}

@keyframes border-pulse {
  0%   { box-shadow: none; }
  45%  { box-shadow: 0 0 0 2px rgba(85, 102, 204, 0.35), 0 0 28px rgba(85, 102, 204, 0.18); }
  100% { box-shadow: none; }
}
</style>
