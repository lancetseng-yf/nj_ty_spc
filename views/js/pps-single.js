const chart = echarts.init(document.getElementById("chart"));
let models = [];
let currentIndex = 0;
let currentType = document.getElementById("productSelect").value;

// --- Chart Option Builder ---
function buildChartOption(model) {
  if (!model) return {};
  return {
    title: {
      text: `${model.type || "N/A"} - ${model.dt}`,
      left: "center",
      top: 10,
      textStyle: { fontSize: 24 },
    },
    legend: {
      data: ["Pressure", "Position", "Speed"],
      textStyle: { fontSize: 20 },
      top: "auto",
      bottom: 20,
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        let idx = params[0].dataIndex + 1;
        let tooltipText = `Index: ${idx}<br/>Biscuit: ${model.sm}<br/>`;
        params.forEach((p) => {
          let displayValue =
            p.seriesName === "Pressure" || p.seriesName === "Speed"
              ? p.data / 15
              : p.data;
          tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${p.color}"></span>${p.seriesName}: ${displayValue}<br/>`;
        });
        return tooltipText;
      },
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: { yAxisIndex: "none" },
        myrestore: {
          show: true,
          icon: `path://M512 0L1024 512 512 1024 0 512Z`,
          title: "Reset Zoom",
          onclick: function () {
            chart.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
          },
        },
      },
    },
    dataZoom: [{ type: "inside", start: 0, end: 100 }],
    grid: { top: 80, bottom: 100, left: 80, right: 20 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: model.position.map((_, i) => i + 1),
      axisLabel: { fontSize: 20, rotate: 30, interval: "auto" },
      name: "Time(s)",
      nameGap: 50,
      nameTextStyle: { fontSize: 20, fontWeight: "bold" },
    },
    yAxis: { type: "value", axisLabel: { fontSize: 20 }, min: 0 },
    series: [
      {
        name: "Pressure",
        type: "line",
        data: (model.pressure || []).map((v) => v * 15),
      },
      { name: "Position", type: "line", data: model.position || [] },
      {
        name: "Speed",
        type: "line",
        data: (model.speed || []).map((v) => v * 15),
      },
    ],
  };
}

// --- Render Chart ---
function renderChart() {
 
  if (models.length === 0) {
    chart.clear();
    chart.setOption({ title: { text: "No Data" } });
    return;
  }
  if (currentIndex >= models.length) currentIndex = models.length - 1;
  if (currentIndex < 0) currentIndex = 0;
 
  chart.setOption(buildChartOption(models[currentIndex]));
}

// --- Fetch Data ---
function fetchData(type) {
  // ⏸ Stop countdown while fetching
  clearInterval(countdownInterval);

  document.getElementById("loading-spinner").style.display = "block";
  chart.clear();

  fetch(`/pps/single/data?type=${type}`)
    .then((res) => res.json())
    .then(({ models: m }) => {
      models = m;
      models = m.sort((a, b) => new Date(a.dt) - new Date(b.dt));
      currentIndex = models.length > 0 ? models.length - 1 : 0;
      renderChart();
    })
    .catch((err) => {
      console.error(err);
      chart.clear();
      chart.setOption({ title: { text: "Error Loading Data" } });
      document.getElementById("loading-spinner").innerHTML =
        "⚠ Failed to load data!";
    })
    .finally(() => {
      document.getElementById("loading-spinner").style.display = "none";

      // ✅ Restart countdown cleanly after data finishes loading
      timeLeft = refreshTime;
      if (autoRefresh) startCountdown();
    });
}

// --- Timestamp Formatter ---
function formatTimestamp(dt) {
  const date = new Date(dt);
  const pad = (num) => num.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDay()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

// --- Countdown & Auto Refresh ---
let refreshTime = 105; // seconds
let timeLeft = refreshTime;
let autoRefresh = true;
let countdownInterval;

function startCountdown() {
  clearInterval(countdownInterval);
  if (!autoRefresh) return;

  countdownInterval = setInterval(() => {
    document.getElementById(
      "countdown"
    ).innerText = `Refreshing in: ${timeLeft}s`;
    timeLeft--;
    if (timeLeft < 0) {
      fetchData(currentType);
      timeLeft = refreshTime;
    }
  }, 1000);
}

// --- Pause/Start Button ---
const refreshBtn = document.getElementById("refreshControl");
const refreshIcon = document.getElementById("refreshIcon");

refreshBtn.addEventListener("click", () => {
  autoRefresh = !autoRefresh;
  if (autoRefresh) {
    refreshIcon.innerText = "pause";
    startCountdown();
  } else {
    refreshIcon.innerText = "play_arrow";
    clearInterval(countdownInterval);
  }
});

// --- Product Change ---
document.getElementById("productSelect").addEventListener("change", () => {
  currentType = document.getElementById("productSelect").value;
  timeLeft = refreshTime;
  fetchData(currentType);
  startCountdown();
});

// --- Prev/Next Buttons ---
document.getElementById("prevBtn").addEventListener("click", () => {
  currentIndex--;
  renderChart();
});
document.getElementById("nextBtn").addEventListener("click", () => {
  currentIndex++;
  renderChart();
});

// --- Initial Load ---
fetchData(currentType);
// startCountdown();

// --- Resize ---
window.addEventListener("resize", () => chart.resize());
