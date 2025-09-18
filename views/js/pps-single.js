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
    const sampleRate = 500; // Hz
    const duration = 8; // seconds
    const timeStep = 1 / sampleRate; // 0.02s

    if (!model) return { title: { text: "No Data", left: "center" } };

    return {
      title: {
        text: `${model.type || "N/A"} - ${model.dt}`,
        left: "center",
        top: 10,
        textStyle: { fontSize: 24 },
      },
      legend: {
        data: [
          "Pressure",
          "Position",
          "Speed",
          "伺服阀控制曲线",
          "伺服阀芯反馈曲线",
          "儲能n2壓力曲線",
          "增壓n2壓力曲線",
          "系統壓力曲線",
        ],
        textStyle: { fontSize: 20 },
        top: "auto",
        bottom: 20,
      },
      tooltip: {
        trigger: "axis",
        formatter: function (params) {
          let idx = params[0].dataIndex + 1;
          let tooltipText = `Index: ${idx}<br/>
                             Biscuit: ${model.sm}<br/>`;
          params.forEach((p) => {
            let displayValue =
              p.seriesName === "Pressure" || p.seriesName === "Speed"
                ? p.data / 15
                : p.data;
            tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${p.color}"></span>${p.seriesName}: ${displayValue}<br/>`;
          });

          tooltipText += `真空度1: ${model.vacuum_pressure1}<br/>`;
          tooltipText += `真空度2: ${model.vacuum_pressure2}<br/>`;
          tooltipText += `真空度3: ${model.vacuum_pressure3}<br/>`;
          tooltipText += `真空度4: ${model.vacuum_pressure4}<br/>`;
          tooltipText += `真空度5: ${model.vacuum_pressure5}<br/>`;
          tooltipText += `真空度6: ${model.vacuum_pressure6}<br/>`;
          tooltipText += `真空度7: ${model.vacuum_pressure7}<br/>`;
          tooltipText += `真空度8: ${model.vacuum_pressure8}<br/>`;
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
        type: "category",
        boundaryGap: false,
        data: Array.from(
          { length: model.position.length },
          (_, i) => (i * timeStep).toFixed(3) // 0.000, 0.002, ...
        ),
        axisLabel: {
          fontSize: 20,
          rotate: 0,
          interval: sampleRate, // one label per second (500 samples)
          formatter: function (_, index) {
            const t = index * timeStep;
            const rounded = Math.round(t); // fix float error
            return Math.abs(t - rounded) < 1e-6 ? rounded + "s" : "";
          },
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
        {
          name: "伺服阀控制曲线",
          type: "line",
          data: (model.control || []).map((v) => v * 1) || [],
        },
        {
          name: "伺服阀芯反馈曲线",
          type: "line",
          data: (model.feedback || []).map((v) => v * 1) || [],
        },
        {
          name: "儲能n2壓力曲線",
          type: "line",
          data: (model.storage_pressure_n2 || []).map((v) => v * 1) || [],
        },
        {
          name: "增壓n2壓力曲線",
          type: "line",
          data:
            (model.pressurization_pressure_n2 || []).map((v) => v * 1) || [],
        },
        {
          name: "系統壓力曲線",
          type: "line",
          data: (model.system_pressure || []).map((v) => v * 1) || [],
        },
      ],
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
