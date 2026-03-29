<template>
  <div class="section">
    <div class="title-chevron">
      <h3>{{ $t("rightSidebar.ProjectOverview.statistics") }}</h3>
      <button
        id="StatisticsChevron"
        class="btn chevron-btn"
        @click="toggleStatistics"
        :class="{ rotated: showStatistics }"
      >
        <fa :icon="['fas', 'chevron-down']" />
      </button>
    </div>

    <div v-if="showStatistics">
      <!-- Donut chart -->
      <div class="chart-container">
        <div v-if="hasData" class="chart-wrapper">
          <Doughnut :data="chartData" :options="chartOptions" />
          <div class="chart-center-text">
            <span class="chart-percent">{{ statisticStore.totalMTDs }}%</span>
            <span class="chart-sublabel">defective</span>
          </div>
        </div>
        <div v-else class="chart-empty">
          <span>No annotations yet</span>
        </div>
      </div>

      <!-- Defect table -->
      <div class="defect-table">
        <div class="table-header">
          <h4 class="col-name">{{ $t("rightSidebar.ProjectOverview.statisticsDefects") }}</h4>
          <h4 class="col-count">{{ $t("rightSidebar.ProjectOverview.statisticsCount") }}</h4>
          <h4 class="col-pct">%</h4>
        </div>

        <div
          v-for="(item, index) in defectsWithPercent"
          :key="index"
          class="table-row"
        >
          <div class="col-name row-name">
            <span class="color-dot" :style="{ background: item.color }"></span>
            <span>{{ item.name }}</span>
          </div>
          <span class="col-count">{{ item.count }}</span>
          <span class="col-pct muted">{{ item.percent }}%</span>
        </div>

        <div class="table-footer">
          <h4 class="col-name">{{ $t("rightSidebar.ProjectOverview.statisticsTotal") }}</h4>
          <h4 class="col-count">{{ statisticStore.total }}</h4>
          <h4 class="col-pct"></h4>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { useAnnotationStore } from "@/stores/AnnotationsStore";
import { useStatisticStore } from "@/stores/StatisticStore";
ChartJS.register(ArcElement, Tooltip);

const annotationStore = useAnnotationStore();
const statisticStore = useStatisticStore();
const showStatistics = ref(true);

const toggleStatistics = () => {
  showStatistics.value = !showStatistics.value;
};

const hasData = computed(() => statisticStore.total > 0);

const defectsWithPercent = computed(() =>
  annotationStore.microtubularDefects.map((d) => ({
    ...d,
    percent: statisticStore.total > 0
      ? Math.round((d.count / statisticStore.total) * 100)
      : 0,
  }))
);

const chartData = computed(() => ({
  labels: annotationStore.microtubularDefects.map((d) => d.name),
  datasets: [
    {
      data: annotationStore.microtubularDefects.map((d) => d.count),
      backgroundColor: annotationStore.microtubularDefects.map((d) => d.color),
      borderWidth: 2,
      borderColor: "#1a1a2e",
      hoverOffset: 6,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: "68%",
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `  ${ctx.label}: ${ctx.parsed}`,
      },
    },
  },
};
</script>

<style scoped>
.chart-container {
  display: flex;
  justify-content: center;
  margin: 10px 0 20px;
}

.chart-wrapper {
  position: relative;
  width: 160px;
  height: 160px;
}

.chart-center-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.chart-percent {
  display: block;
  font-size: 1.6rem;
  font-weight: 700;
  color: white;
  line-height: 1.1;
}

.chart-sublabel {
  display: block;
  font-size: 0.65rem;
  color: rgba(235, 235, 235, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 3px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  font-size: small;
  color: rgba(235, 235, 235, 0.35);
}

.defect-table {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-top: #2d2d42 1px solid;
  border-bottom: #2d2d42 1px solid;
  padding: 12px 0;
  font-size: small;
}

.table-header,
.table-row,
.table-footer {
  display: grid;
  grid-template-columns: 2fr 0.5fr 0.5fr;
  align-items: center;
  padding: 3px 0;
}

.table-header {
  margin-bottom: 6px;
}

.table-footer {
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding-top: 8px;
}

.col-name {
  text-align: left;
}

.col-count,
.col-pct {
  text-align: right;
}

.row-name {
  display: flex;
  align-items: center;
  gap: 7px;
}

.color-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.muted {
  color: rgba(235, 235, 235, 0.45);
}

.show-statistics {
  width: 100%;
  margin-top: 16px;
}
</style>
