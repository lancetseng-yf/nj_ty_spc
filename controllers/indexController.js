exports.getIndexPage = (req, res) => {
  const routes = [
    {
      name: "PPS Single (單一波形)",
      path: "/pps/single",
      description: "PPS Single Shot Data Visualization",
    },
    {
      name: "PPS Single MinMax (單一波形-極值)",
      path: "/pps/single-minmax",
      description: "PPS Single Shot Min/Max Analysis",
    },
    {
      name: "PPS Batch (批次波形)",
      path: "/pps/batch",
      description: "PPS Batch Data Visualization",
    },
    {
      name: "PSMax (最大壓力與速度)",
      path: "/psmax",
      description: "Maximum Pressure & Speed Analysis",
    },
    {
      name: "Biscuit (料餅厚度)",
      path: "/biscuit",
      description: "Biscuit Thickness Monitoring",
    },
    {
      name: "Diecasting Report (壓鑄報表)",
      path: "/diecasting-report",
      description: "Comprehensive Diecasting Report with Sparklines",
    },
  ];

  res.render("index", { routes });
};
