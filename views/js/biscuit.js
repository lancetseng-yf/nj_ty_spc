const chart = echarts.init(document.getElementById("chart"));
const loadingEl = document.getElementById("loading-spinner");
const chartEl = document.getElementById("chart");

const PRODUCT_MEAN = 38;
const PRODUCT_UCL = PRODUCT_MEAN + 6;
const PRODUCT_LCL = PRODUCT_MEAN - 6;

const productConfig = {
  LL: { mean: PRODUCT_MEAN, ucl: PRODUCT_UCL, lcl: PRODUCT_LCL },
  LR: { mean: PRODUCT_MEAN, ucl: PRODUCT_UCL, lcl: PRODUCT_LCL },
  ML: { mean: PRODUCT_MEAN, ucl: PRODUCT_UCL, lcl: PRODUCT_LCL },
  MR: { mean: PRODUCT_MEAN, ucl: PRODUCT_UCL, lcl: PRODUCT_LCL },
  ZP: { mean: PRODUCT_MEAN, ucl: PRODUCT_UCL, lcl: PRODUCT_LCL },
};

// --- Chart Option Builder (same as before) ---
function buildChartOption(filteredData, config) {
  const smValues = filteredData.map((d) => Number(d.sm));
  const minY = 0;
  const maxY = Math.max(...smValues, config.ucl + 50);

  const normal = filteredData
    .filter((d) => d.sm >= config.lcl && d.sm <= config.ucl)
    .map((d) => ({
      value: [new Date(d.dt).getTime(), d.sm],
      id: d.diecasting_eigenvalue_data_id,
    }));
  const below = filteredData
    .filter((d) => d.sm < config.lcl)
    .map((d) => ({
      value: [new Date(d.dt).getTime(), d.sm],
      id: d.diecasting_eigenvalue_data_id,
    }));
  const above = filteredData
    .filter((d) => d.sm > config.ucl)
    .map((d) => ({
      value: [new Date(d.dt).getTime(), d.sm],
      id: d.diecasting_eigenvalue_data_id,
    }));

  return {
    legend: {
      data: ["Normal", "Below LCL", "Above LCL", "Mean", "UCL", "LCL"],
      top: 10,
      textStyle: { fontSize: 16 },
    },
    tooltip: {
      trigger: "item",
      formatter: (p) => {
        if (p.componentType === "markLine") return `${p.name}: ${p.value}`;
        const d = new Date(p.value[0]);
        const pad = (n) => (n < 10 ? "0" + n : n);
        const dateStr = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(
          d.getDate()
        )} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        return `<b>ID:</b> ${p.data.id}<br/><b>Time:</b> ${dateStr}<br/><b>SM:</b> ${p.value[1]}`;
      },
    },
    dataZoom: [{ type: "inside", start: 0, end: 100 }],
    toolbox: {
      show: true,
      feature: {
        dataZoom: { yAxisIndex: "none" },
        myrestore: {
          show: true,
          icon: `path://M512 0L1024 512 512 1024 0 512Z`,
          title: "Reset Zoom",
          onclick: () =>
            chart.dispatchAction({ type: "dataZoom", start: 0, end: 100 }),
        },
      },
    },
    xAxis: {
      type: "time",
      name: "Time",
      nameLocation: "center",
      nameGap: 50,
      nameTextStyle: { fontSize: 20, fontWeight: "bold" },
      axisLabel: {
        fontSize: 18,
        interval: "auto",
        rotate: 30,
        formatter: (val) => {
          const d = new Date(val);
          const pad = (n) => (n < 10 ? "0" + n : n);
          return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(
            d.getDate()
          )}`;
        },
      },
      splitLine: { show: true },
      minInterval: 24 * 60 * 60 * 1000,
    },
    yAxis: {
      type: "value",
      name: "SM(mm)",
      min: minY,
      max: maxY,
      nameLocation: "center",
      axisLabel: { fontSize: 18 },
      nameTextStyle: { fontSize: 20, fontWeight: "bold" },
    },
    series: [
      {
        name: "Normal",
        type: "scatter",
        symbolSize: 12,
        data: normal,
        itemStyle: { color: "blue" },
      },
      {
        name: "Below LCL",
        type: "scatter",
        symbolSize: 12,
        data: below,
        itemStyle: { color: "orange" },
      },
      {
        name: "Above LCL",
        type: "scatter",
        symbolSize: 12,
        data: above,
        itemStyle: { color: "red" },
      },
      {
        name: "Mean",
        type: "line",
        data: [],
        markLine: {
          symbol: "none",
          lineStyle: { color: "green", type: "dashed", width: 3 },
          data: [{ name: "Mean", yAxis: config.mean }],
        },
        itemStyle: { color: "green" },
      },
      {
        name: "UCL",
        type: "line",
        data: [],
        markLine: {
          symbol: "none",
          lineStyle: { color: "red", type: "dashed", width: 3 },
          data: [{ name: "UCL", yAxis: config.ucl }],
        },
        itemStyle: { color: "red" },
      },
      {
        name: "LCL",
        type: "line",
        data: [],
        markLine: {
          symbol: "none",
          lineStyle: { color: "purple", type: "dashed", width: 3 },
          data: [{ name: "LCL", yAxis: config.lcl }],
        },
        itemStyle: { color: "purple" },
      },
    ],
  };
}

// --- Fetch & Render ---
function loadData(type) {
  // ⏸ stop countdown while fetching
  clearInterval(countdownInterval);

  loadingEl.style.display = "flex";
  chartEl.style.display = "none";

  return fetch(`/biscuit/data?type=${type}`)
    .then((res) => res.json())
    .then((data) => {
      const models = data.models || [];
      chart.setOption(buildChartOption(models, productConfig[type]));
    })
    .catch((err) => {
      console.error("Error in loadData:", err);
      loadingEl.textContent = "Failed to load data!";
    })
    .finally(() => {
      loadingEl.style.display = "none";
      chartEl.style.display = "block";
      requestAnimationFrame(() => chart.resize());

      // ✅ restart countdown only after render is done
      timeLeft = refreshTime;
      if (autoRefresh) startCountdown(type);
    });
}

// --- Countdown / Auto Refresh ---
let refreshTime = 30; // seconds
let countdownInterval;
let timeLeft = refreshTime;
let autoRefresh = true;
const refreshIcon = document.getElementById("refreshIcon");

function startCountdown(type) {
  clearInterval(countdownInterval);
  if (!autoRefresh) return;

  countdownInterval = setInterval(() => {
    document.getElementById(
      "countdown"
    ).innerText = `Refreshing in: ${timeLeft}s`;
    timeLeft--;

    if (timeLeft < 0) {
      loadData(type);
      timeLeft = refreshTime;
    }
  }, 1000);
}

// --- Pause / Start Button ---
const refreshBtn = document.getElementById("refreshControl");
refreshBtn.addEventListener("click", () => {
  autoRefresh = !autoRefresh;
  if (autoRefresh) {
    refreshIcon.innerText = "pause";
    startCountdown(currentType);
  } else {
    refreshIcon.innerText = "play_arrow";
    clearInterval(countdownInterval);
  }
});

// --- Initial Load ---

loadData(currentType);
// startCountdown(currentType);

// --- Product Selection ---
document.getElementById("productSelect").addEventListener("change", (e) => {
  currentType = e.target.value;
  loadData(currentType);
  timeLeft = refreshTime;
  startCountdown(currentType);
});

// --- Resize ---
window.addEventListener("resize", () => chart.resize());
