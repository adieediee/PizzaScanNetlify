<template>
    <div class="paragraph">
        <h2>{{ $t('modals.documentation.manualTutorial.title') }}</h2>
        <p>{{ $t('modals.documentation.manualTutorial.intro') }}</p>
        <p class="tip">{{ $t('modals.documentation.manualTutorial.newClass') }}</p>
    </div>
    <div class="paragraph paragraph-last">
        <h3>{{ $t('modals.documentation.manualTutorial.steps.header') }}</h3>
        <ol>
            <li>{{ $t('modals.documentation.manualTutorial.steps.step1') }}</li>
            <li>{{ $t('modals.documentation.manualTutorial.steps.step2') }}</li>
            <li>{{ $t('modals.documentation.manualTutorial.steps.step3') }}</li>
            <li>{{ $t('modals.documentation.manualTutorial.steps.step4') }}</li>
            <li>{{ $t('modals.documentation.manualTutorial.steps.step5') }}</li>
            <li>{{ $t('modals.documentation.manualTutorial.steps.step6') }}</li>
        </ol>
    </div>
</template>

<style scoped>
ol {
    margin: 10px 0;
    padding-left: 24px;
}

li {
    margin-bottom: 10px;
    line-height: 1.5;
}

.tip {
    margin-top: 12px;
    color: #95F204;
    font-size: 0.9rem;
}
</style>
