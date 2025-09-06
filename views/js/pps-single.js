const chart = echarts.init(document.getElementById("chart"));
let models = [];
let currentIndex = 0;

// --- Chart Option Builder ---
function buildChartOption(model) {
  if (!model) return {};
  return {
    title: {
      text: `${model.type || "N/A"} - ${formatTimestamp(model.dt)}`,
      left: "center",
      top: 10,
      textStyle: { fontSize: 24 },
    },
    // Adjustments to the legend
    legend: {
      data: ["Pressure", "Position", "Speed"],
      textStyle: { fontSize: 20 },
      top: "auto", // Reset default top
      bottom: 20, // Move legend to the bottom
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        let idx = params[0].dataIndex + 1;
        let tooltipText = `Index: ${idx}<br/>`;
        tooltipText += `Biscuit: ${model.sm}<br/>`;
        params.forEach((p) => {
          let displayValue =
            p.seriesName === "Pressure" || p.seriesName === "Speed"
              ? p.data / 15
              : p.data;
          tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${p.color}"></span>`;
          tooltipText += `${p.seriesName}: ${displayValue}<br/>`;
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
    // Add padding to the chart to prevent elements from crowding the edges
    grid: {
      top: 80,
      bottom: 100, // Make room for the legend and x-axis labels
      left: 80,
      right: 20,
    },
    // Adjustments to the xAxis
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: model.position.map((_, i) => i + 1),
      axisLabel: {
        fontSize: 20,
        rotate: 30,
        interval: "auto", // ECharts will automatically decide which labels to display to avoid overlap
      },
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
  document.getElementById("loading-spinner").style.display = "block";

  chart.clear();
  fetch(`/pps/single/data?type=${type}`)
    .then((res) => res.json())
    .then(({ models: m }) => {
      models = m;
      currentIndex = models.length > 0 ? models.length - 1 : 0;
      document.getElementById("loading-spinner").style.display = "none";
      renderChart();
    })
    .catch((err) => {
      console.error(err);
      chart.clear();
      chart.setOption({ title: { text: "Error Loading Data" } });
      document.getElementById("loading-spinner").innerHTML =
        "⚠ Failed to load data!";
    });
}

function formatTimestamp(dt) {
  const date = new Date(dt);
  const pad = (num) => num.toString().padStart(2, "0");

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1); // getUTCMonth() is 0-indexed
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// --- Product Change ---
document.getElementById("productSelect").addEventListener("change", () => {
  const type = document.getElementById("productSelect").value;
  fetchData(type);
});

// --- Prev/Next ---
document.getElementById("prevBtn").addEventListener("click", () => {
  currentIndex--;
  renderChart();
});
document.getElementById("nextBtn").addEventListener("click", () => {
  currentIndex++;
  renderChart();
});

// --- Initial Fetch ---
fetchData("<%= type %>");
