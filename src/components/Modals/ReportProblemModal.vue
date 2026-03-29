<template>
  <div
    v-if="modalStore.isModalOpen('reportProblem')"
    id="ReportProblemModal"
    class="modal report-problem-modal-root"
    @click.self="handleClose"
  >
    <div class="report-problem-dialog" role="dialog" aria-modal="true" @click.stop>
      <template v-if="phase === 'form'">
        <div class="report-problem-header">
          <h1 class="report-problem-title">{{ $t('modals.reportProblem.title') }}</h1>
          <button
            id="CloseReportProblemModal"
            type="button"
            class="btn btn-close"
            :aria-label="$t('general.close')"
            @click="handleClose"
          >
            <fa :icon="['fas', 'xmark']" />
          </button>
        </div>
        <p class="report-problem-intro">{{ $t('modals.reportProblem.intro') }}</p>
        <textarea
          id="report-problem-text"
          v-model="message"
          class="report-problem-textarea"
          rows="6"
          :placeholder="$t('modals.reportProblem.placeholder')"
        />
        <div class="report-problem-actions">
          <button
            id="report-problem-send"
            type="button"
            class="btn report-problem-btn-primary"
            :disabled="!canSend"
            @click="submit"
          >
            {{ $t('modals.reportProblem.send') }}
          </button>
        </div>
      </template>
      <template v-else>
        <div class="report-problem-header">
          <h1 class="report-problem-title">{{ $t('modals.reportProblem.thanksTitle') }}</h1>
          <button
            id="CloseReportProblemThanksModal"
            type="button"
            class="btn btn-close"
            :aria-label="$t('general.close')"
            @click="handleClose"
          >
            <fa :icon="['fas', 'xmark']" />
          </button>
        </div>
        <p class="report-problem-thanks-body">{{ $t('modals.reportProblem.thanksBody') }}</p>
        <div class="report-problem-actions">
          <button
            id="report-problem-go-back"
            type="button"
            class="btn report-problem-btn-primary"
            @click="handleClose"
          >
            {{ $t('modals.reportProblem.goBack') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useModalStore } from '@/stores/ModalStore';
import { useLoggingStore } from '@/stores/LoggStore';

const modalStore = useModalStore();
const loggingStore = useLoggingStore();

const phase = ref('form');
const message = ref('');

const canSend = computed(() => message.value.trim().length > 0);

watch(
  () => modalStore.activeModal,
  (name) => {
    if (name === 'reportProblem') {
      phase.value = 'form';
      message.value = '';
    }
  }
);

function submit() {
  if (!canSend.value) return;
  loggingStore.submitProblemReport(message.value.trim());
  phase.value = 'thanks';
}

function handleClose() {
  modalStore.closeModal();
}
</script>

<style scoped>
.report-problem-modal-root {
  z-index: 101;
}

.report-problem-dialog {
  background: #0f111a;
  width: min(100%, 440px);
  max-height: 90vh;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-problem-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.report-problem-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}

.report-problem-intro,
.report-problem-thanks-body {
  margin: 0;
  color: #fff;
  font-size: 0.95rem;
  line-height: 1.5;
  font-weight: 400;
}

.report-problem-textarea {
  width: 100%;
  min-height: 150px;
  resize: vertical;
  box-sizing: border-box;
  background: #252a41;
  border: none;
  border-radius: 8px;
  padding: 12px 14px;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.45;
}

.report-problem-textarea::placeholder {
  color: #8b90a8;
}

.report-problem-textarea:focus {
  outline: 2px solid #3e63dd;
  outline-offset: 0;
}

.report-problem-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.report-problem-btn-primary {
  background: #3f51b5;
  color: #fff !important;
  border: 1px solid #fff;
  border-radius: 999px;
  padding: 10px 28px;
  font-weight: 700;
  font-size: 0.95rem;
}

.report-problem-btn-primary:hover:not(:disabled) {
  background: #4a5fc4;
  color: #fff !important;
}

.report-problem-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  border-color: #ffffff66;
}
</style>
