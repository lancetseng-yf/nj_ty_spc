document.addEventListener("DOMContentLoaded", () => {
  const initialType = "<%= type %>";
  const productSelect = document.getElementById("productSelect");
  const hideControllerCheckbox = document.getElementById("hideControllers");

  const loadingEl = document.getElementById("loading-spinner");
  const mainContent = document.getElementById("main-content");
  const refreshBtn = document.getElementById("refreshControl");
  const refreshIcon = document.getElementById("refreshIcon");
  const submitBtn = document.getElementById("submitBtn");
  const dateFromEl = document.getElementById("datetimeFrom");
  const dateToEl = document.getElementById("datetimeTo");
  const applyLimitsBtn = document.getElementById("applyLimitsBtn");

  let chart, slider, rangeLabel, statsTableBody;
  let scatterData = [];
  let selectedProduct = null;
  let currentType = initialType;

  let refreshTime = 105;
  let timeLeft = refreshTime;
  let autoRefresh = true;
  let countdownInterval;

  const productList = [
    {
      productName: "LL",
      highSpeed: { target: 500, tolerance: 10 },
      castingPressure: { target: 650, tolerance: 50 },
    },
    {
      productName: "LR",
      highSpeed: { target: 450, tolerance: 10 },
      castingPressure: { target: 650, tolerance: 50 },
    },
    {
      productName: "ML",
      highSpeed: { target: 500, tolerance: 10 },
      castingPressure: { target: 720, tolerance: 50 },
    },
    {
      productName: "MR",
      highSpeed: { target: 500, tolerance: 10 },
      castingPressure: { target: 750, tolerance: 50 },
    },
    {
      productName: "ZP",
      highSpeed: { target: 500, tolerance: 10 },
      castingPressure: { target: 700, tolerance: 50 },
    },
  ];

  let manualControlLine = {
    speedUcl: "",
    speedLcl: "",
    pressureUcl: "",
    pressureLcl: "",
  };

  // --- Countdown ---
  function startCountdown() {
    clearInterval(countdownInterval);
    if (!autoRefresh) return;

    countdownInterval = setInterval(() => {
      const countdownLabel = document.getElementById("countdown");
      if (countdownLabel)
        countdownLabel.textContent = `Refreshing in: ${timeLeft}s`;
      timeLeft--;
      if (timeLeft < 0) {
        fetchData(currentType);
        timeLeft = refreshTime;
      }
    }, 1000);
  }

  // --- Fetch Data ---
  function fetchData(type, dateFrom = "", dateTo = "") {
    clearInterval(countdownInterval);
    if (loadingEl) loadingEl.style.display = "block";
    if (mainContent) mainContent.style.display = "none";

    let url = `/psmax/data?type=${type}`;
    if (dateFrom && dateTo) url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;

    fetch(url)
      .then((res) => res.json())
      .then(({ models }) => {
        if (loadingEl) loadingEl.style.display = "none";
        if (mainContent) mainContent.style.display = "block";
        renderMain(models, type);
      })
      .catch((err) => {
        console.error(err);
        if (loadingEl) loadingEl.innerHTML = "Failed to load data!";
      })
      .finally(() => {
        timeLeft = refreshTime;
        if (autoRefresh) startCountdown();
      });
  }

  // --- Render Main ---
  function renderMain(models, type) {
    scatterData = models.map((m) => [
      new Date(m.dt).getTime(),
      Number(m.max_speed),
      Number(m.max_pressure),
      m.diecasting_eigenvalue_data_id,
      m.type,
    ]);

    selectedProduct =
      productList.find((p) => p.productName === type) || productList[0];

    if (!chart) {
      chart = echarts.init(document.getElementById("chart"));
      statsTableBody = document.querySelector("#statsTable tbody");
      rangeLabel = document.getElementById("rangeLabel");
    }

    if (!scatterData.length) {
      chart.clear();
      if (statsTableBody)
        statsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;">No data available</td></tr>`;
      if (slider && slider.noUiSlider) slider.noUiSlider.destroy();
      if (rangeLabel) rangeLabel.textContent = "Time: N/A";
      return;
    }

    // Slider
    if (slider && slider.noUiSlider) slider.noUiSlider.destroy();
    slider = document.getElementById("timeSlider");
    const times = scatterData.map((d) => d[0]);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    noUiSlider.create(slider, {
      start: [minTime, maxTime],
      connect: true,
      range: { min: minTime, max: maxTime },
      step: 1000,
      format: wNumb({ decimals: 0 }),
    });

    slider.noUiSlider.on("update", () => {
      const [from, to] = slider.noUiSlider.get().map(Number);
      if (rangeLabel)
        rangeLabel.textContent = `Time: ${formatTime(from)} ~ ${formatTime(
          to
        )}`;
      refreshChart();
    });

    refreshChart();
    requestAnimationFrame(() => chart.resize());
    window.addEventListener("resize", () => chart.resize());
  }

  function formatTime(ms) {
    const d = new Date(+ms);
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // --- Build Chart Option ---
  function buildChartOption(data, productConfig) {
    const speeds = data.map((d) => d[1]);
    const pressures = data.map((d) => d[2]);
    const xMax = Math.max(...speeds, 0) + 100;
    const yMax = Math.max(...pressures, 0) + 100;

    let okData = data;
    let ngData = [];
    let markLine = null;

    if (productConfig) {
      const sMin =
        manualControlLine.speedLcl ||
        productConfig.highSpeed.target - productConfig.highSpeed.tolerance;
      const sMax =
        manualControlLine.speedUcl ||
        productConfig.highSpeed.target + productConfig.highSpeed.tolerance;
      const pMin =
        manualControlLine.pressureLcl ||
        productConfig.castingPressure.target -
          productConfig.castingPressure.tolerance;
      const pMax =
        manualControlLine.pressureUcl ||
        productConfig.castingPressure.target +
          productConfig.castingPressure.tolerance;

      okData = data.filter(
        (d) => d[1] >= sMin && d[1] <= sMax && d[2] >= pMin && d[2] <= pMax
      );
      ngData = data.filter((d) => !okData.includes(d));

      markLine = {
        silent: true,
        lineStyle: { type: "dashed", color: "red" },
        data: [
          { xAxis: sMin },
          { xAxis: sMax },
          { yAxis: pMin },
          { yAxis: pMax },
        ],
      };
    }

    return {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const [timestamp, speed, pressure, id] = params.data;
          return `<b>ID:</b> ${id}<br/><b>Time:</b> ${formatTime(
            timestamp
          )}<br/><b>Max Speed:</b> ${speed.toFixed(
            2
          )}<br/><b>Max Pressure:</b> ${pressure.toFixed(2)}`;
        },
      },
      xAxis: {
        type: "value",
        name: "Max Speed(cm/s)",
        min: 0,
        max: xMax,
        nameLocation: "center",
        nameGap: 35,
        nameTextStyle: { fontSize: 20, fontWeight: "bold" },
        axisLabel: { fontSize: 20 },
      },
      yAxis: {
        type: "value",
        name: "Max Pressure(bar)",
        min: 0,
        max: yMax,
        nameLocation: "center",
        nameGap: 50,
        nameTextStyle: { fontSize: 20, fontWeight: "bold" },
        axisLabel: { fontSize: 20 },
      },
      series: [
        {
          name: "OK",
          type: "scatter",
          symbolSize: 10,
          data: okData,
          itemStyle: { color: "green" },
          encode: { x: 1, y: 2 },
          animation: false,
          markLine,
        },
        {
          name: "NG",
          type: "scatter",
          symbolSize: 10,
          data: ngData,
          itemStyle: { color: "red" },
          encode: { x: 1, y: 2 },
          animation: false,
        },
      ],
    };
  }

  function updateStatsTable(data) {
    if (!statsTableBody || !selectedProduct) return;

    statsTableBody.innerHTML = "";
    const p = selectedProduct;
    const pData = data.filter((d) => d[4] === p.productName);
    const total = pData.length;
    const sMin =
      manualControlLine.speedLcl || p.highSpeed.target - p.highSpeed.tolerance;
    const sMax =
      manualControlLine.speedUcl || p.highSpeed.target + p.highSpeed.tolerance;
    const pMin =
      manualControlLine.pressureLcl ||
      p.castingPressure.target - p.castingPressure.tolerance;
    const pMax =
      manualControlLine.pressureUcl ||
      p.castingPressure.target + p.castingPressure.tolerance;

    const okCount = pData.filter(
      (d) => d[1] >= sMin && d[1] <= sMax && d[2] >= pMin && d[2] <= pMax
    ).length;
    const ngCount = total - okCount;

    statsTableBody.innerHTML = `
      <tr><td>${
        p.productName
      }</td><td>Warm-Up</td><td>${ngCount}</td><td>${total}</td><td>${
      total ? ((ngCount / total) * 100).toFixed(2) + "%" : "0.00%"
    }</td></tr>
      <tr><td>${
        p.productName
      }</td><td>Normal</td><td>${okCount}</td><td>${total}</td><td>${
      total ? ((okCount / total) * 100).toFixed(2) + "%" : "0.00%"
    }</td></tr>
    `;
  }

  function refreshChart() {
    let filtered = scatterData.filter(
      (d) =>
        d[0] >= Number(slider.noUiSlider.get()[0]) &&
        d[0] <= Number(slider.noUiSlider.get()[1])
    );
    if (selectedProduct)
      filtered = filtered.filter((d) => d[4] === selectedProduct.productName);
    chart.setOption(buildChartOption(filtered, selectedProduct));
    updateStatsTable(filtered);
  }

  // --- Event Listeners ---
  refreshBtn?.addEventListener("click", () => {
    autoRefresh = !autoRefresh;
    refreshIcon.innerText = autoRefresh ? "pause" : "play_arrow";
    if (autoRefresh) startCountdown();
    else clearInterval(countdownInterval);
  });

  productSelect?.addEventListener("change", (e) => {
    currentType = e.target.value;
    timeLeft = refreshTime;
    fetchData(currentType);
    startCountdown();
    if (dateFromEl) dateFromEl.value = "";
    if (dateToEl) dateToEl.value = "";
  });

  submitBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    autoRefresh = false;
    refreshIcon.innerText = "play_arrow";
    clearInterval(countdownInterval);
    fetchData(currentType, dateFromEl.value, dateToEl.value);
  });

  applyLimitsBtn?.addEventListener("click", () => {
    manualControlLine.speedUcl = Number(
      document.getElementById("speedUCL").value
    );
    manualControlLine.speedLcl = Number(
      document.getElementById("speedLCL").value
    );
    manualControlLine.pressureUcl = Number(
      document.getElementById("pressureUCL").value
    );
    manualControlLine.pressureLcl = Number(
      document.getElementById("pressureLCL").value
    );
    refreshChart();
  });

  hideControllerCheckbox?.addEventListener("change", () => {
    const collapseEl = document.getElementById("manual-control");
    if (!collapseEl) return;

    let collapseInstance = bootstrap.Collapse.getInstance(collapseEl);
    if (!collapseInstance) {
      collapseInstance = new bootstrap.Collapse(collapseEl, { toggle: false });
    }

    if (hideControllerCheckbox.checked) {
      collapseInstance.hide();
    } else {
      collapseInstance.show();
    }
  });
  // --- Initial load ---
  fetchData(initialType);
});
