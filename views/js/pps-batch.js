const chartEl = document.getElementById("chart");
const loadingEl = document.getElementById("loading-spinner");
const productSelect = document.getElementById("productSelect");
const chart = echarts.init(chartEl);

const countdownLabel = document.getElementById("countdown");
const refreshBtn = document.getElementById("refreshControl");
const refreshIcon = document.getElementById("refreshIcon");
const submitBtn = document.getElementById("submitBtn");
const dateFromEl = document.getElementById("datetimeFrom");
const dateToEl = document.getElementById("datetimeTo");

let refreshTime = 105; // seconds
let timeLeft = refreshTime;
let countdownInterval;
let autoRefresh = true;

// --- Utility ---
function fmtDateYMDHMS(d) {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseDateAsUTC(dateString) {
  if (!dateString) {
    console.error("Received an invalid date string:", dateString);
    return new Date(); // Return current time as a fallback
  }
  // Reformat 'YYYY/MM/DD HH:MM:SS' to 'YYYY-MM-DDTHH:MM:SSZ'
  // The 'Z' suffix forces JavaScript to parse the string as UTC.
  const isoString = dateString.replace(/\//g, "-").replace(" ", "T") + "Z";
  const date = new Date(isoString);
  // Check if the date is valid after parsing
  if (isNaN(date.getTime())) {
      console.error("Failed to parse date string as UTC:", dateString);
      return new Date(); // Fallback for invalid formats
  }
  return date;
}

function buildTimeValuePairs(arr, dt, id) {
  const start = new Date(dt).getTime();
  const duration = 8000; // 8s per id
  const step = duration / arr.length; // ms per sample

  const points = arr.map((v, i) => ({
    value: [new Date(start + i * step), v],
    diecastingId: id,
  }));

  // 👇 Insert separator so different IDs don't connect
  points.push({ value: [null, null] });

  return points;
}

// --- Chart builder ---
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
        )
      );

    if (Array.isArray(m.pressure))
      pressData.push(
        ...buildTimeValuePairs(
          m.pressure,
          m.dt,
          m.diecasting_eigenvalue_data_id
        )
      );

    if (Array.isArray(m.speed))
      speedData.push(
        ...buildTimeValuePairs(m.speed, m.dt, m.diecasting_eigenvalue_data_id)
      );
  });

  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: (params) => {
        if (!params.length) return "";
        const time = params[0]?.value?.[0]
          ? fmtDateYMDHMS(new Date(params[0].value[0]))
          : "";
        const firstId = params[0]?.data?.diecastingId;
        const model = models.find(
          (m) => m.diecasting_eigenvalue_data_id == firstId
        );
        const sm = model?.sm ?? "N/A";
        const lasercode = model?.lasercode || "N/A";
        const id = model?.diecasting_eigenvalue_data_id || "N/A";

        return (
          `<b>Time:</b> ${time}<br>
          <b>Biscuit:</b> ${sm}<br>
          <b>Laser Code:</b> ${lasercode}<br>
           <b>ID:</b> ${id}<br>
          ` +
          
          params
            .map(
              (p) =>
                `${p.marker} ${p.seriesName}: ${
                  ["Pressure", "Speed"].includes(p.seriesName)
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
      name: "Time",
      nameTextStyle: { fontSize: 20, fontWeight: "bold" },
      splitLine: { show: true },
      axisLabel: { fontSize: 20, rotate: 30 },
    },
    yAxis: {
      type: "value",
      name: "Value",
      nameLocation: "middle",
      nameGap: 20,
      nameTextStyle: { fontSize: 20, fontWeight: "bold" },
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
        connectNulls: false,
        data: posData, // already has null separator inside
      },
      {
        name: "Pressure",
        type: "line",
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: pressData.map(
          (p) =>
            p.value && p.value[0] !== null
              ? {
                  value: [p.value[0], p.value[1] * 15],
                  original: p.value[1],
                  diecastingId: p.diecastingId,
                }
              : { value: [null, null] } // preserve null gap
        ),
      },
      {
        name: "Speed",
        type: "line",
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: speedData.map((p) =>
          p.value && p.value[0] !== null
            ? {
                value: [p.value[0], p.value[1] * 15],
                original: p.value[1],
                diecastingId: p.diecastingId,
              }
            : { value: [null, null] }
        ),
      },
    ],
  };
}

// --- Load data with optional date range ---
function loadData(type, dateFrom = "", dateTo = "") {
  clearInterval(countdownInterval);

  loadingEl.style.display = "flex";
  chartEl.style.display = "none";

  let url = `/pps/batch/data?type=${type}`;
  if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`;
  if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`;

  fetch(url)
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
      timeLeft = refreshTime;
      if (autoRefresh) startCountdown(type);
    });
}

// --- Countdown ---
function startCountdown(type) {
  clearInterval(countdownInterval);
  if (!autoRefresh) return;

  countdownInterval = setInterval(() => {
    countdownLabel.innerText = `Refreshing in: ${timeLeft}s`;
    timeLeft--;
    if (timeLeft < 0) {
      loadData(type, dateFromEl.value, dateToEl.value);
      timeLeft = refreshTime;
    }
  }, 1000);
}

// --- Pause/Resume ---
refreshBtn.addEventListener("click", () => {
  autoRefresh = !autoRefresh;
  clearInterval(countdownInterval);
  refreshIcon.innerText = autoRefresh ? "pause" : "play_arrow";
  if (autoRefresh) startCountdown(productSelect.value);
});

// --- Product change ---
productSelect.addEventListener("change", (e) => {
  timeLeft = refreshTime;
  loadData(e.target.value);
  startCountdown(e.target.value);

  dateFromEl.value = "";
  dateToEl.value = "";
});

// --- Manual date filter submit ---
if (submitBtn) {
  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const dateFrom = dateFromEl.value;
    const dateTo = dateToEl.value;

    autoRefresh = false;
    refreshIcon.innerText = "play_arrow";
    clearInterval(countdownInterval);

    loadData(productSelect.value, dateFrom, dateTo);
  });
}

// --- Initial load ---
loadData("<%= type %>");
window.addEventListener("resize", () => chart.resize());
