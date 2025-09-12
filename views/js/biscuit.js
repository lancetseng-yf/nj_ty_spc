const pad = (n) => (n < 10 ? "0" + n : n);

const formatDateTime = (timestamp) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatDate = (timestamp) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};

const chart = echarts.init(document.getElementById("chart"));
const loadingEl = document.getElementById("loading-spinner");
const chartEl = document.getElementById("chart");

const createProductConfig = (mean, range) => ({
  mean,
  ucl: mean + range,
  lcl: mean - range,
});

const PRODUCT_MEAN = 38;
const PRODUCT_RANGE = 6;

const productConfig = {
  LL: createProductConfig(PRODUCT_MEAN, PRODUCT_RANGE),
  LR: createProductConfig(PRODUCT_MEAN, PRODUCT_RANGE),
  ML: createProductConfig(PRODUCT_MEAN, PRODUCT_RANGE),
  MR: createProductConfig(PRODUCT_MEAN, PRODUCT_RANGE),
  ZP: createProductConfig(PRODUCT_MEAN, PRODUCT_RANGE),
};

// Helper to format data for chart series
const formatSeriesData = (data, config) => {
  const mapDataPoint = (d) => ({
    value: [new Date(d.dt).getTime(), d.sm],
    id: d.diecasting_eigenvalue_data_id,
  });

  return {
    normal: data
      .filter((d) => d.sm >= config.lcl && d.sm <= config.ucl)
      .map(mapDataPoint),
    below: data.filter((d) => d.sm < config.lcl).map(mapDataPoint),
    above: data
      .filter((d) => d.sm > config.ucl)
      .map((d) => ({
        value: [new Date(d.dt).getTime(), d.sm > 100 ? 100 : d.sm],
        id: d.diecasting_eigenvalue_data_id,
      })),
  };
};

// --- Chart Option Builder ---
function buildChartOption(filteredData, config) {
  const { normal, below, above } = formatSeriesData(filteredData, config);
  const minY = 0;
  const maxY = 105;

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
        const dateStr = formatDateTime(p.value[0]);
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
        formatter: (val) => formatDate(val),
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
const renderChart = (data, type) => {
  const models = data.models || [];
  chart.setOption(buildChartOption(models, productConfig[type]));
  loadingEl.style.display = "none";
  chartEl.style.display = "block";
  requestAnimationFrame(() => chart.resize());
};

const fetchData = async (type, dateFrom = null, dateTo = null) => {
  loadingEl.style.display = "flex";
  chartEl.style.display = "none";
  try {
    let url = `/biscuit/data?type=${type}`;
    if (dateFrom && dateTo) {
      url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error in fetchData:", err);
    loadingEl.textContent = "Failed to load data!";
    throw err;
  }
};

async function loadData(type, dateFrom = null, dateTo = null) {
  clearInterval(refreshManager.countdownInterval); // Pause countdown
  try {
    const data = await fetchData(type, dateFrom, dateTo);
    renderChart(data, type);
  } catch (error) {
    // Error already handled in fetchData
  } finally {
    refreshManager.resetCountdown(type);
  }
}

// --- Countdown / Auto Refresh ---
const refreshManager = (() => {
  let refreshTime = 105; // seconds
  let countdownInterval;
  let timeLeft = refreshTime;
  let autoRefresh = true;
  const refreshIcon = document.getElementById("refreshIcon");
  const countdownEl = document.getElementById("countdown");

  const startCountdown = (type) => {
    clearInterval(countdownInterval);
    if (!autoRefresh) return;

    countdownInterval = setInterval(() => {
      countdownEl.innerText = `Refreshing in: ${timeLeft}s`;
      timeLeft--;

      if (timeLeft < 0) {
        loadData(type);
        timeLeft = refreshTime;
      }
    }, 1000);
  };

  const toggleRefresh = (type) => {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      refreshIcon.innerText = "pause";
      startCountdown(type);
    } else {
      refreshIcon.innerText = "play_arrow";
      clearInterval(countdownInterval);
    }
  };

  const pauseRefresh = () => {
    clearInterval(countdownInterval);
    autoRefresh = false;
    refreshIcon.innerText = "play_arrow";
  };

  const resetCountdown = (type) => {
    timeLeft = refreshTime;
    if (autoRefresh) startCountdown(type);
  };

  return {
    startCountdown,
    toggleRefresh,
    pauseRefresh,
    resetCountdown,
    getAutoRefresh: () => autoRefresh,
  };
})();

// --- Pause / Start Button ---
const refreshBtn = document.getElementById("refreshControl");
refreshBtn.addEventListener("click", () => {
  refreshManager.toggleRefresh(currentType);
});

// --- Initial Load ---

const initializeEventListeners = () => {
  document.getElementById("productSelect").addEventListener("change", (e) => {
    currentType = e.target.value;
    loadData(currentType);
    refreshManager.resetCountdown(currentType);
  });

  window.addEventListener("resize", () => chart.resize());

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault(); // prevent page reload

      const dateFrom = document.getElementById("datetimeFrom").value + ":00";
      const dateTo = document.getElementById("datetimeTo").value + ":59";
      loadData(currentType, dateFrom, dateTo);
      refreshManager.pauseRefresh(); // Always pause the timer after manual submission
    });
  }
};

// --- Initial Load ---
loadData(currentType);
initializeEventListeners();
