document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 🔹 DOM Elements
  // =========================
  const chart = echarts.init(document.getElementById("chart"));
  const autoCarouselCheckbox = document.getElementById("autoCarouselCheckbox");
  const collapseEl = document.getElementById("datapicker-control");
  const collapseInstance = new bootstrap.Collapse(collapseEl, {
    toggle: false,
  });

  const productSelect = document.getElementById("productSelect");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const refreshBtn = document.getElementById("refreshControl");
  const refreshIcon = document.getElementById("refreshIcon");
  const loadingSpinner = document.getElementById("loading-spinner");
  const countdownEl = document.getElementById("countdown");

  // =========================
  // 🔹 State
  // =========================
  const REFRESH_TIME = 105; // seconds
  let timeLeft = REFRESH_TIME;
  let autoRefresh = true;
  let countdownInterval;

  let models = [];
  let currentIndex = 0;
  let currentType = productSelect.value || null;

  // =========================
  // 🔹 Utilities
  // =========================
  function startCountdown() {
    clearInterval(countdownInterval);
    if (!autoRefresh) return;

    countdownInterval = setInterval(() => {
      countdownEl.innerText = `Refreshing in: ${timeLeft}s`;
      timeLeft--;

      if (timeLeft < 0) {
        fetchData(currentType);
        timeLeft = REFRESH_TIME;
      }
    }, 1000);
  }

  function updateAutoCarouselState() {
    if (currentType) {
      autoCarouselCheckbox.checked = false; // manual mode
      collapseInstance.show(); // show picker
    } else {
      autoCarouselCheckbox.checked = true; // auto mode
      collapseInstance.hide(); // hide picker
    }
  }

  // =========================
  // 🔹 Chart Functions
  // =========================
  function buildChartOption(model) {
    if (!model) return { title: { text: "No Data", left: "center" } };

    const duration = 8;
    const step500 = 1 / 500;
    const step250 = 1 / 250;

    const series500 = [
      {
        name: "Pressure",
        type: "line",
        showSymbol: false,
        data: (model.pressure || []).map((v, i) => [i * step500, v * 15]),
      },
      {
        name: "Position",
        type: "line",
        showSymbol: false,
        data: (model.position || []).map((v, i) => [i * step500, v]),
      },
      {
        name: "Speed",
        type: "line",
        showSymbol: false,
        data: (model.speed || []).map((v, i) => [i * step500, v * 15]),
      },
    ];

    const series250 = [
      {
        name: "伺服阀控制曲线",
        type: "line",
        showSymbol: false,
        data: (model.control || []).map((v, i) => [i * step250, v]),
      },
      {
        name: "伺服阀芯反馈曲线",
        type: "line",
        showSymbol: false,
        data: (model.feedback || []).map((v, i) => [i * step250, v]),
      },
      {
        name: "儲能n2壓力曲線",
        type: "line",
        showSymbol: false,
        data: (model.storage_pressure_n2 || []).map((v, i) => [i * step250, v]),
      },
      {
        name: "增壓n2壓力曲線",
        type: "line",
        showSymbol: false,
        data: (model.pressurization_pressure_n2 || []).map((v, i) => [
          i * step250,
          v,
        ]),
      },
      {
        name: "系統壓力曲線",
        type: "line",
        showSymbol: false,
        data: (model.system_pressure || []).map((v, i) => [i * step250, v]),
      },
    ];

    return {
      title: {
        text: `${model.type || "N/A"} - ${model.dt}`,
        left: "center",
        top: 10,
        textStyle: { fontSize: 24 },
      },
      legend: {
        data: [...series500, ...series250].map((s) => s.name),
        textStyle: { fontSize: 20 },
        top: "auto",
        bottom: 20,
      },
      tooltip: {
        trigger: "axis",
        formatter: function (params) {
          let time = params[0].data[0];
          let tooltipText = `Time: ${time.toFixed(3)}s<br/>Biscuit: ${
            model.sm
          }<br/>`;

          params.forEach((p) => {
            let displayValue = ["Pressure", "Speed"].includes(p.seriesName)
              ? p.data[1] / 15
              : p.data[1];
            tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${p.color}"></span>${p.seriesName}: ${displayValue}<br/>`;
          });

          for (let i = 1; i <= 8; i++) {
            tooltipText += `真空度${i}: ${model["vacuum_pressure" + i]}<br/>`;
          }
          tooltipText += `機邊爐鋁湯溫度: ${model.lv}<br/>`;
          return tooltipText;
        },
      },
      toolbox: {
        show: true,
        feature: {
          dataZoom: { yAxisIndex: "none" },
          myrestore: {
            show: true,
            icon: "path://M512 0L1024 512 512 1024 0 512Z",
            title: "Reset Zoom",
            onclick: () =>
              chart.dispatchAction({ type: "dataZoom", start: 0, end: 100 }),
          },
        },
      },
      dataZoom: [{ type: "inside", start: 0, end: 100 }],
      grid: { top: 80, bottom: 100, left: 80, right: 20 },
      xAxis: {
        type: "value",
        min: 0,
        max: duration,
        interval: 1,
        axisLabel: { fontSize: 20, formatter: "{value}s" },
        name: "Time(s)",
        nameGap: 50,
        nameTextStyle: { fontSize: 20, fontWeight: "bold" },
      },
      yAxis: { type: "value", axisLabel: { fontSize: 20 }, min: 0 },
      series: [...series500, ...series250],
    };
  }

  function renderChart() {
    if (!models.length) {
      chart.clear();
      chart.setOption({ title: { text: "No Data" } });
      return;
    }
    if (currentIndex >= models.length) currentIndex = models.length - 1;
    if (currentIndex < 0) currentIndex = 0;
    chart.setOption(buildChartOption(models[currentIndex]));
  }

  // =========================
  // 🔹 Data Fetching
  // =========================
  function fetchData(type, dateFrom, dateTo) {
    clearInterval(countdownInterval);
    loadingSpinner.style.display = "block";
    chart.clear();

    let url = `/pps/single/data?&type=${type}`;
    if (dateFrom && dateTo) {
      url += `&dateFrom=${encodeURIComponent(
        dateFrom
      )}&dateTo=${encodeURIComponent(dateTo)}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then(({ models: m }) => {
        models = m.sort((a, b) => new Date(a.dt) - new Date(b.dt));
        currentIndex = models.length > 0 ? models.length - 1 : 0;
        renderChart();
      })
      .catch((err) => {
        console.error(err);
        chart.clear();
        chart.setOption({ title: { text: "Error Loading Data" } });
        loadingSpinner.innerHTML = "⚠ Failed to load data!";
      })
      .finally(() => {
        loadingSpinner.style.display = "none";
        timeLeft = REFRESH_TIME;
        if (autoRefresh) startCountdown();
      });
  }

  // =========================
  // 🔹 Event Bindings
  // =========================
  productSelect.addEventListener("change", () => {
    currentType = productSelect.value;
    timeLeft = REFRESH_TIME;
    fetchData(currentType);
    updateAutoCarouselState();
  });

  prevBtn.addEventListener("click", () => {
    currentIndex--;
    renderChart();
  });

  nextBtn.addEventListener("click", () => {
    currentIndex++;
    renderChart();
  });

  refreshBtn.addEventListener("click", () => {
    autoRefresh = !autoRefresh;
    refreshIcon.innerText = autoRefresh ? "pause" : "play_arrow";

    if (autoRefresh) {
      startCountdown();
    } else {
      clearInterval(countdownInterval);
    }
  });

  autoCarouselCheckbox.addEventListener("change", () => {
    const autoCarousel = autoCarouselCheckbox.checked;
    if (autoCarousel) {
      collapseInstance.hide();
      productSelect.value = "";
      currentType = "";
    } else {
      collapseInstance.show();
    }
  });

  // =========================
  // 🔹 Init
  // =========================
  fetchData(currentType);
  updateAutoCarouselState();
  window.addEventListener("resize", () => chart.resize());
});
