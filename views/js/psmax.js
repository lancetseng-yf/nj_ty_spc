document.addEventListener("DOMContentLoaded", () => {
  const initialType = "<%= type %>";
  const productSelect = document.getElementById("productSelect");
  let chart, slider, rangeLabel, statsTableBody;
  let scatterData = [];
  let selectedProduct = null;

  // Product configs
  const productList = [
    { productName: "LL", highSpeed: { target: 500, tolerance: 10 }, castingPressure: { target: 650, tolerance: 50 } },
    { productName: "LR", highSpeed: { target: 450, tolerance: 10 }, castingPressure: { target: 650, tolerance: 50 } },
    { productName: "ML", highSpeed: { target: 500, tolerance: 10 }, castingPressure: { target: 720, tolerance: 50 } },
    { productName: "MR", highSpeed: { target: 500, tolerance: 10 }, castingPressure: { target: 750, tolerance: 50 } },
    { productName: "ZP", highSpeed: { target: 500, tolerance: 10 }, castingPressure: { target: 700, tolerance: 50 } }
  ];

  // --- Init ---
  fetchData(initialType);

  // --- Dropdown listener ---
  productSelect.addEventListener("change", (e) => {
    const selected = e.target.value;
    fetchData(selected);
  });

  // --- Fetch data + render ---
  function fetchData(type) {
    document.getElementById("loading-spinner").style.display = "block";
    document.getElementById("main-content").style.display = "none";

    fetch(`/psmax/data?type=${type}`)
      .then(res => res.json())
      .then(({ models, type }) => {
        document.getElementById("loading-spinner").style.display = "none";
        document.getElementById("main-content").style.display = "block";
        renderMain(models, type);
      })
      .catch(err => {
        console.error(err);
        document.getElementById("loading-spinner").innerHTML = "Failed to load data!";
      });
  }

  function renderMain(models, currentType) {
    scatterData = models.map((m) => [
      new Date(m.dt).getTime(),
      Number(m.max_speed),
      Number(m.max_pressure),
      m.diecasting_eigenvalue_data_id,
      m.type,
    ]);

    selectedProduct = productList.find((p) => p.productName === currentType) || productList[0];

    if (!chart) {
      chart = echarts.init(document.getElementById("chart"));
      statsTableBody = document.querySelector("#statsTable tbody");
      rangeLabel = document.getElementById("rangeLabel");
    }

    // setup slider fresh each time
    if (slider) slider.noUiSlider.destroy();
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
      rangeLabel.textContent = `Time: ${formatTime(slider.noUiSlider.get()[0])} ~ ${formatTime(slider.noUiSlider.get()[1])}`;
      refreshChart();
    });

    refreshChart();
    window.addEventListener("resize", () => chart.resize());
  }

  function formatTime(ms) {
    const d = new Date(+ms);
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function buildChartOption(data, productConfig) {
    const speeds = data.map((d) => d[1]);
    const pressures = data.map((d) => d[2]);
    const xMax = Math.max(...speeds, 0);
    const yMax = Math.max(...pressures, 0);
    let markLine = null;
    if (productConfig) {
      const sMin = productConfig.highSpeed.target - productConfig.highSpeed.tolerance;
      const sMax = productConfig.highSpeed.target + productConfig.highSpeed.tolerance;
      const pMin = productConfig.castingPressure.target - productConfig.castingPressure.tolerance;
      const pMax = productConfig.castingPressure.target + productConfig.castingPressure.tolerance;
      markLine = {
        silent: true,
        lineStyle: { type: "dashed", color: "red" },
        data: [{ xAxis: sMin }, { xAxis: sMax }, { yAxis: pMin }, { yAxis: pMax }],
      };
    }
    return {
      title: { text: "Scatter: Max Speed vs Max Pressure", left: "center" },
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const timestamp = params.data[0];
          const speed = params.data[1];
          const pressure = params.data[2];
          const id = params.data[3];
          const formattedTime = formatTime(timestamp);
          return `
            <b>ID:</b> ${id}<br/>
            <b>Time:</b> ${formattedTime}<br/>
            <b>Max Speed:</b> ${speed.toFixed(2)}<br/>
            <b>Max Pressure:</b> ${pressure.toFixed(2)}
          `;
        },
      },
      xAxis: {
          type: "value",
          name: "Max Speed(cm/s)",
          min: 0,
          max: xMax + 100,
          nameLocation: "center", 
          nameGap: 35,
           nameTextStyle: {
    fontSize: 20,       
    fontWeight: 'bold' ,   
     axisLabel: {
    fontSize: 20,  
  }
  }
        },
     yAxis: {
        type: "value",
        name: "Max Pressure(bar)",
        min: 0,
        max: yMax + 100,
        nameLocation: "center",
        nameGap: 50,  
         nameTextStyle: {
    fontSize: 20,        
    fontWeight: 'bold',   
    axisLabel: {
    fontSize: 20, 
  }
  }
      },
      series: [{ type: "scatter", symbolSize: 10, data, encode: { x: 1, y: 2 }, animation: false, markLine }],
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
    const okCount = pData.filter((d) => d[1] >= sMin && d[1] <= sMax && d[2] >= pMin && d[2] <= pMax).length;
    const ngCount = total - okCount;

    statsTableBody.innerHTML += `
      <tr><td>${p.productName}</td><td>Warm-Up</td><td>${ngCount}</td><td>${total}</td><td>${total ? ((ngCount / total) * 100).toFixed(2) + "%" : "0.00%"}</td></tr>
      <tr><td>${p.productName}</td><td>Normal</td><td>${okCount}</td><td>${total}</td><td>${total ? ((okCount / total) * 100).toFixed(2) + "%" : "0.00%"}</td></tr>
    `;
  }

  function refreshChart() {
    let filtered = scatterData.filter(
      (d) =>
        d[0] >= Number(slider.noUiSlider.get()[0]) &&
        d[0] <= Number(slider.noUiSlider.get()[1])
    );
    if (selectedProduct) filtered = filtered.filter((d) => d[4] === selectedProduct.productName);
    chart.setOption(buildChartOption(filtered, selectedProduct));
    updateStatsTable(filtered);
  }
});