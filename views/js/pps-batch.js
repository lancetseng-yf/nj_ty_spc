const chartEl = document.getElementById("chart");
const loadingEl = document.getElementById("loading-spinner");
const productSelect = document.getElementById("productSelect");
const chart = echarts.init(chartEl);

const countdownLabel = document.getElementById("countdown");
const refreshBtn = document.getElementById("refreshControl");
const refreshIcon = document.getElementById("refreshIcon");

let refreshTime = 30; // seconds
let timeLeft = refreshTime;
let countdownInterval;
let autoRefresh = true;

function fmtDateYMDHMS(d) {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(
    d.getUTCDate()
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(
    d.getUTCSeconds()
  )}`;
}

function buildTimeValuePairs(arr, dt, id) {
  const start = new Date(dt).getTime();
  const step = 1000 / 50; // 50Hz
  return arr.map((v, i) => ({
    value: [new Date(start + i * step), v],
    diecastingId: id,
  }));
}

function buildChartOption(models) {
  const posData = [],
    pressData = [],
    speedData = [];

  models.forEach((m) => {
    if (Array.isArray(m.position))
      posData.push(
        ...buildTimeValuePairs(
          m.position,
          m.dt,
          m.diecasting_eigenvalue_data_id
        ),
        { value: [null, null] }
      );
    if (Array.isArray(m.pressure))
      pressData.push(
        ...buildTimeValuePairs(
          m.pressure,
          m.dt,
          m.diecasting_eigenvalue_data_id
        ),
        { value: [null, null] }
      );
    if (Array.isArray(m.speed))
      speedData.push(
        ...buildTimeValuePairs(m.speed, m.dt, m.diecasting_eigenvalue_data_id),
        { value: [null, null] }
      );
  });

  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: (params) => {
        const time = params[0]?.value?.[0]
          ? fmtDateYMDHMS(new Date(params[0].value[0]))
          : "";
        const firstId = params[0]?.data?.diecastingId;
        const model = models.find(
          (m) => m.diecasting_eigenvalue_data_id == firstId
        );
        const sm = model?.sm ?? "N/A";

        return (
          `<b>Time:</b> ${time}<br>
                <b>Biscuit:</b> ${sm}<br>` +
          params
            .map(
              (p) =>
                `${p.marker} ${p.seriesName}: ${
                  p.seriesName === "Pressure" || p.seriesName === "Speed"
                    ? p.data.original ?? p.value[1]
                    : p.value[1]
                }`
            )
            .join("<br>")
        );
      },
    },
    legend: {
      top: 0,
      data: ["Position", "Pressure", "Speed"],
      textStyle: { fontSize: 20 },
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
    xAxis: {
      type: "time",
      name: "Time(s)",
      nameTextStyle: { fontSize: 20, fontWeight: "bold", color: "#333" },
      splitLine: { show: true },
      axisLabel: { fontSize: 20, rotate: 30 },
    },
    yAxis: {
      type: "value",
      name: "Value",
      nameLocation: "middle",
      nameGap: 20,
      nameTextStyle: { fontSize: 20, fontWeight: "bold", color: "#333" },
      min: 0,
      splitLine: { show: true },
      axisLabel: { fontSize: 20 },
    },
    dataZoom: [
      { type: "slider", xAxisIndex: 0, filterMode: "none", bottom: 10 },
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
    ],
    series: [
      {
        name: "Position",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: posData,
      },
      {
        name: "Pressure",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: pressData.map((p) => ({
          value: [p.value[0], p.value[1] * 15],
          original: p.value[1],
          diecastingId: p.diecastingId,
        })),
      },
      {
        name: "Speed",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: speedData.map((p) => ({
          value: [p.value[0], p.value[1] * 15],
          original: p.value[1],
          diecastingId: p.diecastingId,
        })),
      },
    ],
  };
}

function loadData(type) {
  // ⏸ Stop countdown while fetching
  clearInterval(countdownInterval);

  loadingEl.style.display = "flex";
  chartEl.style.display = "none";

  fetch(`/pps/batch/data?type=${type}`)
    .then((res) => res.json())
    .then((data) => {
      const models = data.models || [];
      chart.setOption(buildChartOption(models));
      requestAnimationFrame(() => chart.resize());
    })
    .catch((err) => {
      console.error(err);
      loadingEl.textContent = "❌ Failed to load data!";
    })
    .finally(() => {
      loadingEl.style.display = "none";
      chartEl.style.display = "block";

      // ✅ Restart countdown only after data has rendered
      timeLeft = refreshTime;
      if (autoRefresh) startCountdown(type);
    });
}
// --- Countdown logic ---
function startCountdown(type) {
  clearInterval(countdownInterval);
  if (!autoRefresh) return;

  countdownInterval = setInterval(() => {
    countdownLabel.innerText = `Refreshing in: ${timeLeft}s`;
    timeLeft--;
    if (timeLeft < 0) {
      loadData(type);
      timeLeft = refreshTime;
    }
  }, 1000);
}

// Pause/Start toggle
refreshBtn.addEventListener("click", () => {
  autoRefresh = !autoRefresh;
  clearInterval(countdownInterval);

  if (autoRefresh) {
    refreshIcon.innerText = "pause";
    // timeLeft = refreshTime; // reset timer
    startCountdown(productSelect.value);
  } else {
    refreshIcon.innerText = "play_arrow";
  }
});

// --- Init ---
productSelect.addEventListener("change", (e) => {
  timeLeft = refreshTime;
  loadData(e.target.value);
  startCountdown(e.target.value);
});

loadData("<%= type %>");
// startCountdown("<%= type %>");
