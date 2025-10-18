// =================================================================
// === 1. ECHARTS CUSTOM CELL RENDERER ============================
// =================================================================

class EChartCellRenderer {
  init(params) {
    this.eGui = document.createElement("div");
    this.eGui.className = "chart-cell-container";

    this.chartDiv = document.createElement("div");
    this.chartDiv.style.height = "100%";
    this.chartDiv.style.width = "100%";
    this.eGui.appendChild(this.chartDiv);

    this.params = params;
    this.chart = null;

    // Defer chart initialization until DOM attached
    setTimeout(() => this.renderChart(), 0);
  }

  getGui() {
    return this.eGui;
  }

  renderChart() {
    let chartData = this.params.value;
    if (Array.isArray(chartData)) {
      chartData = chartData
        .map((val) => {
          const num = Number(val);
          return isNaN(num) ? 0 : num;
        })
        .filter((val) => typeof val === "number");
    } else {
      chartData = [];
    }

    if (chartData.length === 0) {
      this.chartDiv.innerHTML =
        '<div style="text-align:center; padding-top:20px;">No Curve Data</div>';
      return;
    }

    this.chart = echarts.init(this.chartDiv);

    const options = {
      grid: { left: "5%", right: "5%", top: "5%", bottom: "5%" },
      xAxis: {
        type: "category",
        show: false,
        data: chartData.map((_, i) => i),
      },
      yAxis: { type: "value", show: false },
      series: [
        {
          data: chartData,
          type: "line",
          smooth: true,
          showSymbol: false,
          areaStyle: {
            opacity: 0.15,
            color: this.getChartColor(this.params.colDef.field),
          },
          lineStyle: {
            color: this.getChartColor(this.params.colDef.field),
            width: 2,
          },
        },
      ],
      tooltip: {
        trigger: "axis",
        formatter: (params) =>
          `Step ${params[0].dataIndex}: ${params[0].value.toFixed(2)}`,
      },
    };

    this.chart.setOption(options);
  }

  getChartColor(field) {
    const colors = {
      pressure: "#ef4444",
      position: "#3b82f6",
      speed: "#10b981",
      control: "#f59e0b",
      feedback: "#8b5cf6",
      storage_pressure_n2: "#06b6d4",
      pressurization_pressure_n2: "#f97316",
      system_pressure: "#d946ef",
    };
    return colors[field] || "#6b7280";
  }

  refresh() {
    return false;
  }

  destroy() {
    if (this.chart) {
      echarts.dispose(this.chart);
      this.chart = null;
    }
  }
}

// =================================================================
// === 2. DATA UTILITIES ==========================================
// =================================================================

function convertStringToArray(data) {
  if (typeof data === "string") {
    try {
      const jsonArray = JSON.parse(data);
      if (Array.isArray(jsonArray)) return jsonArray;
    } catch (e) {
      return data
        .split(/, |,| /)
        .filter((s) => s.trim() !== "")
        .map(Number);
    }
  }
  return Array.isArray(data) ? data : [];
}

function normalizeArray(arr) {
  return arr.map(Number);
}

const rawModel = {};

// =================================================================
// === 3. MAP DB ITEM TO MODEL ====================================
// =================================================================

function mapDbItemToModel(item, rawModel) {
  const curveFields = [
    "pressure",
    "speed",
    "position",
    "control",
    "feedback",
    "storage_pressure_n2",
    "pressurization_pressure_n2",
    "system_pressure",
  ];

  const model = {
    ...rawModel,
    diecasting_eigenvalue_data_id: item.diecasting_eigenvalue_data_id || "",
    no: item.no || "",
    dt: item.dt || item.create_time || "",
    create_time: item.create_time || "",
    type: item.type || "",
    lasercode: item.lasercode || "",
  };

  curveFields.forEach((field) => {
    const rawData = item[field];
    const parsedData = Array.isArray(rawData)
      ? rawData
      : convertStringToArray(rawData);
    model[field] = normalizeArray(parsedData);
  });

  for (const key in item) {
    if (
      !curveFields.includes(key) &&
      typeof item[key] !== "object" &&
      key !== "models"
    ) {
      model[key] = item[key];
    }
  }

  return model;
}

// =================================================================
// === 4. AG GRID SETUP ===========================================
// =================================================================

const createChartColumn = (field, headerName) => ({
  headerName,
  field,
  minWidth: 150,
  cellRenderer: "EChartCellRenderer",
  cellStyle: { padding: "0", overflow: "visible" },
});

let gridApi = null;
let cachedRows = null;
let cellMinWidth = 100;

const gridOptions = {
  components: { EChartCellRenderer },
  rowData: [],
  pagination: true,
  paginationPageSize: 10,
  domLayout: "autoHeight",
  loading: true,
  defaultColDef: {
    resizable: true,
    flex: 1,
    minWidth: cellMinWidth,
  },
  columnDefs: [
    {
      headerName: "ID",
      field: "diecasting_eigenvalue_data_id",
      width: 80,
      pinned: "left",
    },
    { headerName: "Type", field: "type", width: 100 },
    { headerName: "Laser Code", field: "lasercode", width: 140 },
    { headerName: "No", field: "no", width: cellMinWidth },
    // { headerName: "Date Time", field: "dt", width: 180 },
    { headerName: "C1", field: "c1", width: cellMinWidth },
    { headerName: "T1", field: "t1", width: cellMinWidth },
    { headerName: "V1", field: "v1", width: cellMinWidth },
    { headerName: "GP", field: "gp", width: cellMinWidth },
    { headerName: "C2", field: "c2", width: cellMinWidth },
    { headerName: "T2", field: "t2", width: cellMinWidth },
    { headerName: "V2", field: "v2", width: cellMinWidth },
    { headerName: "Create Time", field: "create_time", width: 180 },
    { headerName: "V Max", field: "vm", width: cellMinWidth },
    { headerName: "CC", field: "cc", width: cellMinWidth },
    { headerName: "T3", field: "t3", width: cellMinWidth },
    { headerName: "TD", field: "td", width: cellMinWidth },
    { headerName: "P Max", field: "pm", width: cellMinWidth },
    { headerName: "PF", field: "pf", width: cellMinWidth },
    { headerName: "VA", field: "va", width: cellMinWidth },
    { headerName: "PR", field: "pr", width: cellMinWidth },
    { headerName: "PS", field: "ps", width: cellMinWidth },
    { headerName: "FC", field: "fc", width: cellMinWidth },
    { headerName: "SM", field: "sm", width: cellMinWidth },
    { headerName: "TC", field: "tc", width: cellMinWidth },
    { headerName: "TP", field: "tp", width: cellMinWidth },
    { headerName: "SE", field: "se", width: cellMinWidth },
    { headerName: "QT", field: "qt", width: cellMinWidth },
    createChartColumn("pressure", "壓力曲線"),
    { headerName: "Vacuum Pressure", field: "vacuum_pressure", width: cellMinWidth },
    { headerName: "TPT", field: "tpt", width: cellMinWidth },
    
    createChartColumn("position", "位置曲線"),
    createChartColumn("speed", "速度曲線"),
    createChartColumn("control", "控制曲線"),
    createChartColumn("feedback", "反饋曲線"),
    createChartColumn("storage_pressure_n2", "N2儲存壓力"),
    createChartColumn("pressurization_pressure_n2", "N2加壓壓力"),
    { headerName: "LV", field: "lv", width: cellMinWidth },
    createChartColumn("system_pressure", "系統壓力"),
    { headerName: "Shot Position", field: "shot_position", width: cellMinWidth },
  ],
  onGridReady: async (params) => {
    gridApi = params.api;
    console.log("✅ Grid ready");
    await loadDataFromServer();
  },
};

// =================================================================
// === 5. FILTER / CLEAR ==========================================
// =================================================================

document.getElementById("btnFilter").addEventListener("click", (e) => {
  e.preventDefault();
  const query = {
    from: document.getElementById("datetimeFrom").value,
    to: document.getElementById("datetimeTo").value,
    sn: document.getElementById("snInput").value,
    type: document.getElementById("typeSelect").value,
  };
  loadDataFromServer(query);
});

document.getElementById("btnClear").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("datetimeFrom").value = "";
  document.getElementById("datetimeTo").value = "";
  document.getElementById("snInput").value = "";
  document.getElementById("typeSelect").value = "";
  loadDataFromServer({});
});

// =================================================================
// === 6. DATA LOADER =============================================
// =================================================================

async function loadDataFromServer(query = {}) {
  try {
    if (gridApi) gridApi.setGridOption("loading", true);

    const url = "/diecasting-report/data?" + new URLSearchParams(query);
    console.log("📡 Fetching:", url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);

    const payload = await res.json();
    console.log("✅ Payload:", payload);

    const rows = Array.isArray(payload.models)
      ? payload.models.map((item) => mapDbItemToModel(item, rawModel))
      : [];

    if (gridApi && typeof gridApi.setGridOption === "function") {
      gridApi.setGridOption("rowData", rows);
      gridApi.paginationGoToFirstPage?.();
    } else {
      cachedRows = rows;
    }
  } catch (err) {
    console.error("❌ Failed to load diecasting data:", err);
    if (gridApi) gridApi.setGridOption("rowData", []);
  } finally {
    if (gridApi) gridApi.setGridOption("loading", false);
  }
}

// =================================================================
// === 7. DOM INITIALIZATION ======================================
// =================================================================

document.addEventListener("DOMContentLoaded", () => {
  const gridDiv = document.querySelector("#myGrid");
  agGrid.createGrid(gridDiv, gridOptions);

  flatpickr("#datetimeFrom", {
    enableTime: true,
    time_24hr: true,
    dateFormat: "Y-m-d H:i:S",
  });
  flatpickr("#datetimeTo", {
    enableTime: true,
    time_24hr: true,
    dateFormat: "Y-m-d H:i:S",
  });
});
