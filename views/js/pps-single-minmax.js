document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 🔹 DOM Elements
  // =========================
  const chart = echarts.init(document.getElementById("chart"));
  const autoCarouselCheckbox = document.getElementById("autoCarouselCheckbox");
  const collapseEl = document.getElementById("datapicker-control");
  const collapseInstance = new bootstrap.Collapse(collapseEl, { toggle: false });

  const productSelect = document.getElementById("productSelect");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const refreshBtn = document.getElementById("refreshControl");
  const refreshIcon = document.getElementById("refreshIcon");
  const loadingSpinner = document.getElementById("loading-spinner");
  const countdownEl = document.getElementById("countdown");
  const submitBtn = document.getElementById("submitBtn");
  const dateFromEl = document.getElementById("datetimeFrom");
  const dateToEl = document.getElementById("datetimeTo");
  const submitSnBtn = document.getElementById("snSearchBtn");
  const snEl = document.getElementById("snInput");

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
  function minMaxScale(arr) {
    if (!arr || arr.length === 0) return [];
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    if (max === min) return arr.map(() => 0);
    return arr.map((v) => (v - min) / (max - min));
  }

  function startCountdown() {
    clearInterval(countdownInterval);
    if (!autoRefresh) return;

    countdownInterval = setInterval(() => {
      countdownEl.innerText = `${timeLeft} ${i18nLabels.refresh_time_label}`;
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

  function fmtDateYMDHMS(d) {
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // =========================
  // 🔹 Chart Functions
  // =========================
  function buildChartOption(model) {
    if (!model) return { title: { text: "No Data", left: "center" } };

    const duration = 8;
    const step500 = 1 / 500;
    const step250 = 1 / 250;

    // Normalize all relevant signals (0–1)
    const series500 = [
      {
        name: `${i18nLabels.pressure}`,
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.pressure || []).map((v, i) => [i * step500, v]),
      },
      {
        name: `${i18nLabels.position}`,
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.position || []).map((v, i) => [i * step500, v]),
      },
      {
        name: `${i18nLabels.speed}`,
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.speed || []).map((v, i) => [i * step500, v]),
      },
    ];

    const series250 = [
      {
        name: `${i18nLabels.series_servo_valve_control}`, //"伺服阀控制曲线"
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.control || []).map((v, i) => [i * step250, v]),
      },
      {
        name: `${i18nLabels.series_servo_valve_feedback}`,//"伺服阀芯反馈曲线"
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.feedback || []).map((v, i) => [i * step250, v]),
      },
      {
        name: `${i18nLabels.series_storage_pressure_n2}`, //"儲能n2壓力曲線"
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.storage_pressure_n2 || []).map((v, i) => [i * step250, v]),
      },
      {
        name: `${i18nLabels.series_pressurization_pressure_n2}`,//"增壓n2壓力曲線"
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.pressurization_pressure_n2 || []).map((v, i) => [i * step250, v]),
      },
      {
        name: `${i18nLabels.series_system_pressure}`,//"系統壓力曲線"
        type: "line",
        showSymbol: false,
        data: minMaxScale(model.system_pressure || []).map((v, i) => [i * step250, v]),
      },
    ];

    return {
      title: {
        text: `${model.type}_${model.lasercode || "N/A"}_${new Date(
          model.dt
        ).toLocaleString([], { hour12: false })}`,
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
          const lasercode = model.lasercode || "N/A";
          let time = params[0].data[0];
          let tooltipText = `<b>${i18nLabels.time}:</b> ${time.toFixed(3)} <br/>
                             <b>${i18nLabels.thickness}:</b> ${model.sm} <br/>
                             <b>${i18nLabels.lasercode}:</b> ${lasercode}<br/>`;

          params.forEach((p) => {
            tooltipText += `
              <span style="display:inline-block;margin-right:5px;
              border-radius:50%;width:10px;height:10px;
              background-color:${p.color}"></span>
              ${p.seriesName}: ${(p.data[1]).toFixed(2)}<br/>
            `;
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
        axisLabel: { fontSize: 20, formatter: `{value}${i18nLabels.second}` },
        name: `${i18nLabels.time_sec}`,
        nameGap: 50,
        nameTextStyle: { fontSize: 20, fontWeight: "bold" },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 20 },
        min: 0,
        max: 1,
        name: "Normalized Value (0–1)",
        nameGap: 40,
        nameTextStyle: { fontSize: 18, fontWeight: "bold" },
      },
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
  function fetchData(type, dateFrom, dateTo, sn) {
    clearInterval(countdownInterval);
    loadingSpinner.style.display = "block";
    chart.clear();

    let url = `/pps/single/data?&type=${type}`;
    if (dateFrom && dateTo) {
      url += `&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
    }
    if (sn) url += `&sn=${encodeURIComponent(sn)}`;

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

    if (autoRefresh) startCountdown();
    else clearInterval(countdownInterval);
  });

  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const dateFrom = dateFromEl.value;
    const dateTo = dateToEl.value;

    autoRefresh = false;
    refreshIcon.innerText = "play_arrow";
    clearInterval(countdownInterval);

    fetchData(productSelect.value, dateFrom, dateTo);
  });

  submitSnBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const sn = snEl.value;
    autoRefresh = false;
    refreshIcon.innerText = "play_arrow";
    clearInterval(countdownInterval);

    fetchData(null, null, null, sn);
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
