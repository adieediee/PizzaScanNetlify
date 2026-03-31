<template>
    <div class="paragraph">
        <h2>{{ $t('modals.documentation.aiAnnotation.title') }}</h2>
        <p>{{ $t('modals.documentation.aiAnnotation.intro') }}</p>
    </div>
    <div class="paragraph">
        <h3>{{ $t('modals.documentation.aiAnnotation.howItWorks.header') }}</h3>
        <ol>
            <li>{{ $t('modals.documentation.aiAnnotation.howItWorks.step1') }}</li>
            <li>{{ $t('modals.documentation.aiAnnotation.howItWorks.step2') }}</li>
            <li>{{ $t('modals.documentation.aiAnnotation.howItWorks.step3') }}</li>
            <li>{{ $t('modals.documentation.aiAnnotation.howItWorks.step4') }}</li>
            <li>{{ $t('modals.documentation.aiAnnotation.howItWorks.step5') }}</li>
        </ol>
    </div>
    <div class="paragraph">
        <h3>{{ $t('modals.documentation.aiAnnotation.confidence.header') }}</h3>
        <p>{{ $t('modals.documentation.aiAnnotation.confidence.description') }}</p>
        <div class="confidence-levels">
            <span class="confidence high">High</span>
            <span class="confidence medium">Medium</span>
            <span class="confidence low">Low</span>
        </div>
    </div>
    <div class="paragraph paragraph-last">
        <p class="tip">{{ $t('modals.documentation.aiAnnotation.tip') }}</p>
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

.confidence-levels {
    display: flex;
    gap: 10px;
    margin-top: 10px;
    flex-wrap: wrap;
}

.confidence {
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: bold;
}

.confidence.high {
    background: #22c55e22;
    color: #4ade80;
    border: 1px solid #4ade8044;
}

.confidence.medium {
    background: #f9731622;
    color: #fb923c;
    border: 1px solid #fb923c44;
}

.confidence.low {
    background: #ef444422;
    color: #f87171;
    border: 1px solid #f8717144;
}
</style>
