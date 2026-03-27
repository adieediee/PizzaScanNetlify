<template>
    <div class="paragraph">
        <h2>{{$t('modals.documentation.about.title')}}</h2>
        <p>{{$t('welcome.welcome.description')}}</p>
        <p v-if="showWelcomeGoal">{{$t('welcome.welcome.goal')}}</p>
    </div>
    <div class="paragraph">
        <h2>{{$t('welcome.aiModel.title')}}</h2>
        <p>{{$t('welcome.aiModel.training')}}</p>
        <p>{{$t('welcome.aiModel.usage')}}</p>
        <p>{{$t('welcome.aiModel.evolving')}}</p>
    </div>
    <div class="paragraph paragraph-last">
        <h2>{{$t('welcome.experience.title')}}</h2>
        <p>{{$t('welcome.experience.dataCollection')}}</p>
        <p>{{$t('welcome.experience.insights')}}</p>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const showWelcomeGoal = computed(() => String(t('welcome.welcome.goal') || '').trim().length > 0);
</script>
