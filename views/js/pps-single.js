document.addEventListener("DOMContentLoaded", () => {
  const chart = echarts.init(document.getElementById("chart"));
  let models = [];
  let currentIndex = 0;
  let currentType = document.getElementById("productSelect").value;

  // --- Auto-refresh ---
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

  // --- Build chart option ---
  function buildChartOption(model) {
    if (!model) return { title: { text: "No Data", left: "center" } };

    const duration = 8; // seconds

    // Sampling steps
    const step500 = 1 / 500; // 500Hz series (Pressure, Position, Speed)
    const step250 = 1 / 250; // 250Hz series (other series)

    // Prepare 500Hz series
    const series500 = [
      {
        name: "Pressure",
        type: "line",
        showSymbol: false, // no dots
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

    // Prepare 250Hz series
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

    // Combine all series
    const series = [...series500, ...series250];

    return {
      title: {
        text: `${model.type || "N/A"} - ${model.dt}`,
        left: "center",
        top: 10,
        textStyle: { fontSize: 24 },
      },
      legend: {
        data: series.map((s) => s.name),
        textStyle: { fontSize: 20 },
        top: "auto",
        bottom: 20,
      },
      tooltip: {
        trigger: "axis",
        formatter: function (params) {
          let time = params[0].data[0]; // x-axis value = time in seconds
          let tooltipText = `Time: ${time.toFixed(3)}s<br/>Biscuit: ${
            model.sm
          }<br/>`;
          params.forEach((p) => {
            let displayValue =
              p.seriesName === "Pressure" || p.seriesName === "Speed"
                ? p.data[1] / 15
                : p.data[1];
            tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${p.color}"></span>${p.seriesName}: ${displayValue}<br/>`;
          });

          // Add vacuum pressures
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
        type: "value",
        min: 0,
        max: duration,
        interval: 1,
        axisLabel: {
          fontSize: 20,
          formatter: "{value}s",
        },
        name: "Time(s)",
        nameGap: 50,
        nameTextStyle: { fontSize: 20, fontWeight: "bold" },
      },
      yAxis: { type: "value", axisLabel: { fontSize: 20 }, min: 0 },
      series: series,
    };
  }

  // --- Render chart ---
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

  // --- Fetch data with optional date range ---
  function fetchData(type, dateFrom, dateTo) {
    clearInterval(countdownInterval);
    document.getElementById("loading-spinner").style.display = "block";
    chart.clear();

    let url = `/pps/single/data?type=${type}`;
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
        document.getElementById("loading-spinner").innerHTML =
          "⚠ Failed to load data!";
      })
      .finally(() => {
        document.getElementById("loading-spinner").style.display = "none";
        timeLeft = refreshTime;
        if (autoRefresh) startCountdown();
      });
  }

  // --- Product dropdown change ---
  document.getElementById("productSelect").addEventListener("change", () => {
    currentType = document.getElementById("productSelect").value;
    timeLeft = refreshTime;
    fetchData(currentType);

    document.getElementById("datetimeFrom").value = "";
    document.getElementById("datetimeTo").value = "";
  });

  // --- Prev/Next navigation ---
  document.getElementById("prevBtn").addEventListener("click", () => {
    currentIndex--;
    renderChart();
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    currentIndex++;
    renderChart();
  });

  // --- Manual date range submission ---
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const dateFrom = document.getElementById("datetimeFrom").value;
      const dateTo = document.getElementById("datetimeTo").value;
      fetchData(currentType, dateFrom, dateTo);
      autoRefresh = false;
      refreshIcon.innerText = "play_arrow";
    });
  }

  // --- Pause/Resume auto-refresh ---
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

  // --- Initial load ---
  fetchData(currentType);

  // --- Resize chart on window resize ---
  window.addEventListener("resize", () => chart.resize());
});
