<template>
    <div class="modal">
        <div class="modal-content welcome-popup">
            <div class="welcome-heading">
                <h1 v-if="step === 0" class="blue">{{ $t('welcome.welcome.title') }}</h1>
                <h1 v-if="step === 1" class="blue">{{ $t('welcome.aiModel.title') }}</h1>
                <h1 v-if="step === 2" class="blue">{{ $t('welcome.experience.title') }}</h1>
            </div>
            <div class="welcome-body">
                <div v-if="step === 0">
                    <p class="welcome-lead">{{ $t('welcome.welcome.description') }}</p>
                    <p v-if="showWelcomeGoal" class="welcome-sub">{{ $t('welcome.welcome.goal') }}</p>
                </div>
                <div v-if="step === 1">
                    <p>{{ $t('welcome.aiModel.usage') }}</p>
                    <p>{{ $t('welcome.aiModel.training') }}</p>
                    <p>{{ $t('welcome.aiModel.evolving') }}</p>
                </div>
                <div v-if="step === 2">
                    <p>{{ $t('welcome.experience.dataCollection') }}</p>
                    <p>{{ $t('welcome.experience.insights') }}</p>
                    <div class="agree">
                        <input v-model="agreeChecked" type="checkbox" class="checkbox">
                        <span>{{ $t('welcome.experience.agreement') }}</span>
                    </div>
                </div>
            </div>
            <div class="welcome-actions">
                <button
                    id="WelcomeBackButton"
                    class="btn btn-outlined"
                    :style="{ visibility: step === 0 ? 'hidden' : 'visible' }"
                    @click="previousStep"
                >{{ $t('general.backButton') }}</button>
                <button
                    id="WelcomeNextButton"
                    class="btn btn-filled"
                    :disabled="step === 2 && !agreeChecked"
                    @click="nextStep"
                >{{ nextButtonText }}</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useBoardingStore } from '@/stores/BoardingStore';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const step = ref(0);
const agreeChecked = ref(false);
const boardingStore = useBoardingStore();

const nextStep = () => {
    step.value++;
    if (step.value === 3) {
        boardingStore.setWelcome();
    }
};

const previousStep = () => {
    step.value--;
};

const nextButtonText = computed(() => {
    return step.value === 2 ? t('general.finishButton') : t('general.nextButton');
});

const showWelcomeGoal = computed(() => String(t('welcome.welcome.goal') || '').trim().length > 0);

</script>

<style scoped>
.welcome-popup.modal-content {
    width: calc(100% - 2rem);
    max-width: 32rem;
    height: auto;
    min-height: unset;
    max-height: min(85vh, 40rem);
    padding: 2rem 2rem 1.75rem;
    flex-direction: column;
    justify-content: flex-start;
}

.welcome-heading {
    margin-bottom: 1.25rem;
}

.welcome-heading h1 {
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.35;
}

.welcome-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

.welcome-body p {
    font-size: 1.05rem;
    line-height: 1.5;
    margin: 0 0 1rem;
}

.welcome-body .welcome-lead {
    font-size: 1.08rem;
    line-height: 1.55;
    margin-bottom: 0;
}

.welcome-body .welcome-sub {
    margin-top: 0.75rem;
    margin-bottom: 0;
    opacity: 0.92;
}

.welcome-body p:last-child {
    margin-bottom: 0;
}

.blue {
    font-weight: bolder;
    color: #3e63dd;
}

.welcome-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.75rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.agree {
    display: flex;
    align-items: flex-start;
    margin-top: 1.25rem;
    margin-bottom: 0;
}

.checkbox {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0.2rem 0.75rem 0 0;
    flex-shrink: 0;
}

.agree span {
    font-size: 1rem;
    line-height: 1.45;
}
</style>
