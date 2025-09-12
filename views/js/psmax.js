document.addEventListener("DOMContentLoaded", () => {
  const initialType = "<%= type %>";
  const productSelect = document.getElementById("productSelect");
  let chart, slider, rangeLabel, statsTableBody;
  let scatterData = [];
  let selectedProduct = null;
  let currentType = initialType;

  // Auto-refresh
  let refreshTime = 105; // seconds
  let timeLeft = refreshTime;
  let autoRefresh = true;
  let countdownInterval;

  // Product configs
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

  // --- Init ---
  fetchData(initialType);

  // --- Dropdown listener ---
  productSelect.addEventListener("change", (e) => {
    currentType = e.target.value;
    timeLeft = refreshTime;
    fetchData(currentType);
    startCountdown();

    document.getElementById("datetimeFrom").value = "";
    document.getElementById("datetimeTo").value = "";
  });

  // --- Fetch data + render ---
  function fetchData(type) {
    // Stop countdown while fetching
    clearInterval(countdownInterval);

    document.getElementById("loading-spinner").style.display = "block";
    document.getElementById("main-content").style.display = "none";

    fetch(`/psmax/data?type=${type}`)
      .then((res) => res.json())
      .then(({ models }) => {
        document.getElementById("loading-spinner").style.display = "none";
        document.getElementById("main-content").style.display = "block";
        renderMain(models, type);
      })
      .catch((err) => {
        console.error(err);
        document.getElementById("loading-spinner").innerHTML =
          "Failed to load data!";
      })
      .finally(() => {
        // Reset countdown after fetch completes
        timeLeft = refreshTime;
        startCountdown();
      });
  }

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

    // ✅ Handle no data case
    if (!scatterData.length) {
      chart.clear();
      statsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;">No data available</td></tr>`;
      if (slider && slider.noUiSlider) {
        slider.noUiSlider.destroy();
      }
      rangeLabel.textContent = "Time: N/A";
      return;
    }

    // --- Setup slider ---
    if (slider && slider.noUiSlider) {
      slider.noUiSlider.destroy();
    }
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
      rangeLabel.textContent = `Time: ${formatTime(from)} ~ ${formatTime(to)}`;
      refreshChart();
    });

    refreshChart();

    // ✅ Ensure chart resizes properly
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

  function buildChartOption(data, productConfig) {
    const speeds = data.map((d) => d[1]);
    const pressures = data.map((d) => d[2]);
    const xMax = Math.max(...speeds, 0);
    const yMax = Math.max(...pressures, 0);

    let markLine = null;
    let okData = data;
    let ngData = [];

    if (productConfig) {
      const sMin =
        productConfig.highSpeed.target - productConfig.highSpeed.tolerance;
      const sMax =
        productConfig.highSpeed.target + productConfig.highSpeed.tolerance;
      const pMin =
        productConfig.castingPressure.target -
        productConfig.castingPressure.tolerance;
      const pMax =
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
        max: xMax + 100,
        nameLocation: "center",
        nameGap: 35,
        nameTextStyle: { fontSize: 20, fontWeight: "bold" },
        axisLabel: { fontSize: 20 },
      },
      yAxis: {
        type: "value",
        name: "Max Pressure(bar)",
        min: 0,
        max: yMax + 100,
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
    statsTableBody.innerHTML = "";
    if (!selectedProduct) return;

    const p = selectedProduct;
    const pData = data.filter((d) => d[4] === p.productName);
    const total = pData.length;
    const sMin = p.highSpeed.target - p.highSpeed.tolerance;
    const sMax = p.highSpeed.target + p.highSpeed.tolerance;
    const pMin = p.castingPressure.target - p.castingPressure.tolerance;
    const pMax = p.castingPressure.target + p.castingPressure.tolerance;
    const okCount = pData.filter(
      (d) => d[1] >= sMin && d[1] <= sMax && d[2] >= pMin && d[2] <= pMax
    ).length;
    const ngCount = total - okCount;

    statsTableBody.innerHTML += `
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

  // --- Countdown ---
  const refreshBtn = document.getElementById("refreshControl");
  const refreshIcon = document.getElementById("refreshIcon");

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

  // --- Manual Date Range Submission ---
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault(); // prevent form reload

      let dateFrom = document.getElementById("datetimeFrom").value;
      let dateTo = document.getElementById("datetimeTo").value;

      // Stop countdown (manual filtering should not auto-refresh)
      clearInterval(countdownInterval);
      autoRefresh = false;
      refreshIcon.innerText = "play_arrow";

      // Fetch with date range
      loadData(currentType, dateFrom, dateTo);
    });
  }

  // --- New loadData (manual fetch by date range) ---
  function loadData(type, dateFrom, dateTo) {
    document.getElementById("loading-spinner").style.display = "block";
    document.getElementById("main-content").style.display = "none";

    let url = `/psmax/data?type=${type}`;
    if (dateFrom && dateTo) {
      url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then(({ models }) => {
        document.getElementById("loading-spinner").style.display = "none";
        document.getElementById("main-content").style.display = "block";
        renderMain(models, type);
      })
      .catch((err) => {
        console.error(err);
        document.getElementById("loading-spinner").innerHTML =
          "Failed to load data!";
      });
  }
});
