<template>
    <div class="paragraph">
        <h2>{{ $t('modals.documentation.aiDetection.title') }}</h2>
        <p>{{ $t('modals.documentation.aiDetection.intro') }}</p>
    </div>
    <div class="paragraph">
        <h3>{{ $t('modals.documentation.aiDetection.howItWorks.header') }}</h3>
        <ol>
            <li>{{ $t('modals.documentation.aiDetection.howItWorks.step1') }}</li>
            <li>{{ $t('modals.documentation.aiDetection.howItWorks.step2') }}</li>
            <li>{{ $t('modals.documentation.aiDetection.howItWorks.step3') }}</li>
            <li>{{ $t('modals.documentation.aiDetection.howItWorks.step4') }}</li>
            <li>{{ $t('modals.documentation.aiDetection.howItWorks.step5') }}</li>
        </ol>
    </div>
    <div class="paragraph paragraph-last">
        <p class="tip">{{ $t('modals.documentation.aiDetection.tip') }}</p>
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
    color: #95F204;
    font-size: 0.9rem;
}
</style>
