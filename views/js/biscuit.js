// --- Helpers ---
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

// --- Chart setup ---
const chartEl = document.getElementById("chart");
const loadingEl = document.getElementById("loading-spinner");
const chart = echarts.init(chartEl);

// --- DateTime Picker: Process & Clear ---
const datetimeFrom = document.getElementById("datetimeFrom");
const datetimeTo = document.getElementById("datetimeTo");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");

// Only assign if not already declared
if (typeof currentType === "undefined") currentType = "LL";
if (typeof chartData === "undefined") chartData = [];
if (typeof productConfig === "undefined") productConfig = {};

// --- Format series based on limits ---
const formatSeriesData = (data, config) => {
  return {
    normal: data
      .filter((d) => d.sm >= config.lcl && d.sm <= config.ucl)
      .map((d) => ({
        value: [new Date(d.dt).getTime(), d.sm],
        id: d.diecasting_eigenvalue_data_id,
      })),
    below: data
      .filter((d) => d.sm < config.lcl)
      .map((d) => ({
        value: [new Date(d.dt).getTime(), d.sm],
        id: d.diecasting_eigenvalue_data_id,
      })),
    above: data
      .filter((d) => d.sm > config.ucl)
      .map((d) => ({
        value: [new Date(d.dt).getTime(), d.sm],
        id: d.diecasting_eigenvalue_data_id,
      })),
  };
};

// --- Build chart option ---
const buildChartOption = (data, config) => {
  const { normal, below, above } = formatSeriesData(data, config);
  const minY = 0;
  const maxY = 105;

  return {
    legend: {
      data: ["正常", "低於管制下限", "高於管制上限", "平均值", "管制上限", "管制下限"],
      top: 10,
      textStyle: { fontSize: 16 },
    },
    tooltip: {
      trigger: "item",
      formatter: (p) => {
        if (p.componentType === "markLine") return `${p.name}: ${p.value}`;
        return `<b>索引:</b> ${p.data.id}<br/><b>時間:</b> ${formatDateTime(
          p.value[0]
        )}<br/><b>料餅厚度:</b> ${p.value[1]}`;
      },
    },
    dataZoom: [{ type: "inside", start: 0, end: 100 }],
    xAxis: {
      type: "time",
      name: "時間",
      nameLocation: "center",
      nameGap: 50,
      nameTextStyle: { fontSize: 20, fontWeight: "bold" },
      axisLabel: {
        fontSize: 18,
        interval: "auto",
        rotate: 30,
        formatter: formatDate,
      },
      splitLine: { show: true },
      minInterval: 24 * 60 * 60 * 1000,
    },
    yAxis: {
      type: "value",
      name: "料餅厚度(mm)",
      min: minY,
      max: maxY,
      nameLocation: "center",
      axisLabel: { fontSize: 18 },
      nameTextStyle: { fontSize: 20, fontWeight: "bold" },
    },
    series: [
      {
        name: "正常",
        type: "scatter",
        symbolSize: 12,
        data: normal,
        itemStyle: { color: "blue" },
      },
      {
        name: "低於管制下限",
        type: "scatter",
        symbolSize: 12,
        data: below,
        itemStyle: { color: "orange" },
      },
      {
        name: "高於管制上限",
        type: "scatter",
        symbolSize: 12,
        data: above,
        itemStyle: { color: "red" },
      },
      {
        name: "平均值",
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
        name: "管制上限",
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
        name: "管制下限",
        type: "line",
        data: [],
        markLine: {
          symbol: "none",
          lineStyle: { color: "orange", type: "dashed", width: 3 },
          data: [{ name: "LCL", yAxis: config.lcl }],
        },
        itemStyle: { color: "orange" },
      },
    ],
  };
};

// --- Fetch data ---
const fetchData = async (type, dateFrom = null, dateTo = null) => {
  refreshManager.stop(); // pause refresh while fetching
  loadingEl.style.display = "flex";
  chartEl.style.display = "none";
  try {
    let url = `/biscuit/data?type=${type}`;
    if (dateFrom && dateTo) url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const res = await fetch(url);
    const data = await res.json();
    chartData = data.models || [];

    if (!productConfig[type]) {
      const defaultMean = 38,
        defaultRange = 6;
      productConfig[type] = {
        mean: defaultMean,
        ucl: defaultMean + defaultRange,
        lcl: defaultMean - defaultRange,
      };
    }

    chart.setOption(buildChartOption(chartData, productConfig[type]));
  } catch (err) {
    console.error(err);
    loadingEl.textContent = "Failed to load data!";
  } finally {
    loadingEl.style.display = "none";
    chartEl.style.display = "block";
    chart.resize();
    refreshManager.reset();
  }
};

// --- Apply table limits ---
document.getElementById("applyLimitsBtn").addEventListener("click", () => {
  const mean = Number(document.getElementById("thicknessMean").value);
  const ucl = Number(document.getElementById("thicknessUCL").value);
  const lcl = Number(document.getElementById("thicknessLCL").value);

  if (isNaN(mean) || isNaN(ucl) || isNaN(lcl))
    return alert("Enter valid numbers!");
  productConfig[currentType] = { mean, ucl, lcl };
  chart.setOption(buildChartOption(chartData, productConfig[currentType]));
});

// --- Product selection ---
document.getElementById("productSelect")?.addEventListener("change", (e) => {
  currentType = e.target.value;
  fetchData(currentType);
});

// --- Refresh Manager ---
if (typeof refreshManager === "undefined") {
  var refreshManager = {
    refreshTime: 105, // seconds
    timeLeft: 105,
    interval: null,
    autoRefresh: true,
    start: function () {
      this.stop();
      if (!this.autoRefresh) return;
      this.interval = setInterval(() => {
        this.timeLeft--;
        document.getElementById(
          "countdown"
        ).innerText = `${this.timeLeft} 秒後自動刷新`;
        if (this.timeLeft <= 0) {
          fetchData(currentType);
          this.timeLeft = this.refreshTime;
        }
      }, 1000);
    },
    stop: function () {
      if (this.interval) clearInterval(this.interval);
    },
    reset: function () {
      this.timeLeft = this.refreshTime;
      if (this.autoRefresh) this.start();
    },
    toggle: function () {
      this.autoRefresh = !this.autoRefresh;
      if (this.autoRefresh) {
        document.getElementById("refreshIcon").innerText = "pause";
        this.start();
      } else {
        document.getElementById("refreshIcon").innerText = "play_arrow";
        this.stop();
      }
    },
  };
}

// --- Hook refresh button ---
document.getElementById("refreshControl")?.addEventListener("click", () => {
  refreshManager.toggle();
});

// Process button: fetch data with date range
submitBtn.addEventListener("click", () => {
  const from = datetimeFrom.value.trim();
  const to = datetimeTo.value.trim();

  if (!from || !to) {
    alert("Please enter both From and To dates!");
    return;
  }

  // Optionally: you can format them to yyyy-MM-dd or any server format
  fetchData(currentType, from, to);
});

// Clear button: reset date inputs and fetch all data
clearBtn.addEventListener("click", () => {
  datetimeFrom.value = "";
  datetimeTo.value = "";
  fetchData(currentType); // fetch without date filter
});

// --- Initial load ---
fetchData(currentType);
window.addEventListener("resize", () => chart.resize());
refreshManager.start();
