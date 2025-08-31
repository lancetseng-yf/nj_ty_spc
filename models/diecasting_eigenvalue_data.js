const { DataTypes } = require("sequelize");
const sequelize = require("../db2");
const { tr } = require("date-fns/locale");
const { parse, isValid } = require('date-fns');

const DiecastingEigenvalueData = sequelize.define(
  "DiecastingEigenvalueData",
  {
    diecasting_eigenvalue_data_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    no: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "编号",
    },
    dt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "时间",
    },
    c1: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "慢速行程",
    },
    t1: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "慢速时间",
    },
    v1: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "慢速速度",
    },
    gp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "冲头阻力",
    },
    c2: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "高速行程",
    },
    t2: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "高速时间",
    },
    v2: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "高速平均速度",
    },
    create_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    vm: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "高速速度",
    },
    cc: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "增压行程",
    },
    t3: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "增压时间",
    },
    td: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "增压延时",
    },
    pm: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "最大增压",
    },
    pf: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "增压压力",
    },
    va: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "内浇口速度",
    },
    pr: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "填充压力",
    },
    ps: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "铸造压力",
    },
    fc: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "合模力",
    },
    sm: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "料饼厚度",
    },
    tc: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "循环周期",
    },
    tp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "建压时间",
    },
    se: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "射料结束位置",
    },
    qt: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "品质系数",
    },
    casting_pressure: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "压力曲线",
    },
    vacuum_pressure: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度",
    },
    tpt: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "探普特红外模温监控",
    },
    lasercode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "激光编码",
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "位置曲线",
      field: "position",
    },
    speed: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "速度曲线",
    },
    control: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "伺服阀控制曲线",
      field: "control",
    },
    feedback: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "伺服阀芯反馈曲线",
    },
    storage_pressure_n2: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "储能n2压力曲线",
    },
    pressurization_pressure_n2: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "增压n2压力曲线",
    },
    lv: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "保温炉温度",
    },
    system_pressure: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "系统压力曲线",
    },
    vacuum_pressure1: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度1",
    },
    vacuum_pressure2: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度2",
    },
    vacuum_pressure3: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度3",
    },
    vacuum_pressure4: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度4",
    },
    vacuum_pressure5: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度5",
    },
    vacuum_pressure6: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度6",
    },
    vacuum_pressure7: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度7",
    },
    vacuum_pressure8: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "真空度8",
    },
    shot_position: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "打料位置",
    },
  },
  {
    tableName: "diecasting_eigenvalue_data",
    timestamps: false,
    createdAt: false,
    updatedAt: false, // Disable updatedAt as it's not in your schema
    underscored: false, // Use camelCase for attributes (match your column names)
  }
);

module.exports = DiecastingEigenvalueData;
