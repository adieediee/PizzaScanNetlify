<template>
    <div class="paragraph">
        <h2>{{ $t('modals.documentation.layout.layoutDescription.header') }}</h2>
        <p>{{ $t('modals.documentation.layout.layoutDescription.description') }}</p>
    </div>
    <div class="paragraph">
        <h3>{{ $t('modals.documentation.layout.navigation.header') }}</h3>
        <p>{{ $t('modals.documentation.layout.navigation.description') }}</p>
        <ul>
            <li><span class="label">AI</span> — {{ $t('modals.documentation.layout.navigation.features.ai') }}</li>
            <li><span class="label">AI Detection</span> — {{ $t('modals.documentation.layout.navigation.features.aiDetection') }}</li>
            <li>
                <fa :icon="['fas', 'expand']" />
                — {{ $t('modals.documentation.layout.navigation.features.centerImage') }}
            </li>
            <li>
                <fa :icon="['fas', 'rotate-left']" />
                — {{ $t('modals.documentation.layout.navigation.features.undo') }}
            </li>
            <li>
                <span class="defect-name">Normal</span> — {{ $t('modals.documentation.layout.navigation.features.selectDefect') }}
            </li>
            <li>
                <fa :icon="['fas', 'circle-half-stroke']" />
                — {{ $t('modals.documentation.layout.navigation.features.changeOpacity') }}
            </li>
            <li>
                <fa :icon="['fas', 'circle-dot']" />
                — {{ $t('modals.documentation.layout.navigation.features.changeSize') }}
            </li>
            <li><span class="strong">{{ $t('modals.documentation.layout.navigation.features.openProject') }}</span></li>
            <li><span class="strong">{{ $t('modals.documentation.layout.navigation.features.saveProject') }}</span></li>
            <li><span class="strong">{{ $t('modals.documentation.layout.navigation.features.exportProject') }}</span></li>
            <li>
                <fa :icon="['fas', 'gear']" />
                — {{ $t('modals.documentation.layout.navigation.features.openSettings') }}
            </li>
            <li>
                <fa :icon="['fas', 'circle-question']" />
                — {{ $t('modals.documentation.layout.navigation.features.openDocumentation') }}
            </li>
        </ul>
    </div>
    <div class="paragraph">
        <h3>{{ $t('modals.documentation.layout.leftSidebar.header') }}</h3>
        <p>{{ $t('modals.documentation.layout.leftSidebar.description') }}</p>
        <ul>
            <li>{{ $t('modals.documentation.layout.leftSidebar.imageInteractions.click') }}</li>
            <li>{{ $t('modals.documentation.layout.leftSidebar.imageInteractions.rightClick') }}</li>
            <li>{{ $t('modals.documentation.layout.leftSidebar.imageInteractions.subImages') }}</li>
        </ul>
        <p>{{ $t('modals.documentation.layout.leftSidebar.annotationList.header') }}</p>
    </div>
    <div class="paragraph">
        <h3>{{ $t('modals.documentation.layout.mainImageArea.header') }}</h3>
        <p>{{ $t('modals.documentation.layout.mainImageArea.description') }}</p>
        <ul>
            <li>{{ $t('modals.documentation.layout.mainImageArea.annotation.add') }}</li>
            <li>{{ $t('modals.documentation.layout.mainImageArea.annotation.delete') }}</li>
            <li>{{ $t('modals.documentation.layout.mainImageArea.annotation.details') }}</li>
            <li>{{ $t('modals.documentation.layout.mainImageArea.annotation.move') }}</li>
            <li>{{ $t('modals.documentation.layout.mainImageArea.annotation.copyPaste') }}</li>
        </ul>
        <p>{{ $t('modals.documentation.layout.mainImageArea.zoom.drag') }}</p>
        <div class="sub-section">
            <h4>{{ $t('modals.documentation.layout.mainImageArea.subNavigation.header') }}</h4>
            <p>{{ $t('modals.documentation.layout.mainImageArea.subNavigation.description') }}</p>
        </div>
    </div>
    <div class="paragraph paragraph-last">
        <h3>{{ $t('modals.documentation.layout.rightSidebar.header') }}</h3>
        <p>{{ $t('modals.documentation.layout.rightSidebar.description') }}</p>
        <div class="right-sidebar-paragraph">
            <h4>{{ $t('modals.documentation.layout.rightSidebar.projectOverview.header') }}</h4>
            <p>{{ $t('modals.documentation.layout.rightSidebar.projectOverview.description') }}</p>
        </div>
        <div class="right-sidebar-paragraph">
            <h4>{{ $t('modals.documentation.layout.rightSidebar.imageOverview.header') }}</h4>
            <p>{{ $t('modals.documentation.layout.rightSidebar.imageOverview.description') }}</p>
        </div>
        <div class="right-sidebar-paragraph">
            <h4>{{ $t('modals.documentation.layout.rightSidebar.annotationOverview.header') }}</h4>
            <p>{{ $t('modals.documentation.layout.rightSidebar.annotationOverview.description') }}</p>
        </div>
    </div>
</template>

<style scoped>
    .defect-name {
        color: #95F204;
        background: #95F20422;
        padding: 1px 6px;
        border-radius: 4px;
    }

    .label {
        font-weight: bold;
        color: #aaaacc;
    }

    .right-sidebar-paragraph {
        margin-bottom: 20px;
    }

    .right-sidebar-paragraph h4 {
        margin: 0;
        font-weight: bolder;
        margin-bottom: 10px;
    }

    .right-sidebar-paragraph p {
        margin-left: 20px;
    }

    .sub-section {
        margin-top: 16px;
        padding-left: 4px;
        border-left: 3px solid #3E63DD44;
    }

    .sub-section h4 {
        margin: 0 0 6px 0;
        font-weight: bold;
    }

    ul {
        margin: 8px 0 12px 0;
        padding-left: 20px;
    }

    li {
        margin-bottom: 6px;
    }
</style>
