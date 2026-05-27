const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// --- Collectors ---
const { collectGBB100Status } = require("./collectors/GBB100Collector");
const { collectFortigateStatus } = require("./collectors/FortigateCollector");
const { collectM365Status } = require("./collectors/M365Collector");
const { runNetworkChecks } = require("./collectors/NetworkCollector");
const { collectUnifiHealth } = require("./collectors/UnifiCollector");

// --- Utils ---
const {
  logReportAndCollectAlerts,
  getOverallStats,
  clearState,
} = require("./utils/reportUtils");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 3002;
const CHECK_INTERVAL = (process.env.CHECK_INTERVAL_MINUTES || 5) * 60 * 1000;

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/**
 * รันการตรวจสอบสุขภาพระบบทั้งหมด
 */
async function monitorTask() {
  const timestamp = new Date().toLocaleString("th-TH");
  console.log(`\n🚀 [${timestamp}] เริ่มรอบการตรวจสอบสถานะระบบ...`);

  clearState();

  const tasks = [
    { id: "GBB100", fn: collectGBB100Status },
    { id: "Network", fn: runNetworkChecks },
    { id: "FortiGate", fn: collectFortigateStatus },
    { id: "Unifi", fn: collectUnifiHealth },
    { id: "M365", fn: collectM365Status },
  ];

  const results = await Promise.allSettled(tasks.map((t) => t.fn()));

  results.forEach((res, i) => {
    const id = tasks[i].id;
    if (res.status === "fulfilled" && res.value) {
      logReportAndCollectAlerts(res.value);
      console.log(`  ✅ ${id}: สำเร็จ`);
    } else {
      console.error(`  ❌ ${id}: ล้มเหลว →`, res.reason?.message || "ไม่ทราบสาเหตุ");
    }
  });

  const summary = getOverallStats();
  summary.lastUpdate = timestamp;

  io.emit("update-dashboard", summary);
  console.log(`📊 เสร็จสิ้น: พบปัญหา ${summary.alerts.length} รายการ`);
}

// --- Socket.io ---
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  const status = getOverallStats();
  status.lastUpdate = new Date().toLocaleString("th-TH");
  socket.emit("update-dashboard", status);
});

// --- API Routes ---
app.get("/api/status", (_req, res) => {
  res.json(getOverallStats());
});

app.post("/api/trigger-check", (_req, res) => {
  console.log("🔘 Manual check triggered");
  monitorTask();
  res.json({ success: true, message: "Check started" });
});

// --- Start ---
server.listen(PORT, () => {
  console.log(`
  =========================================
  🚀  Monitoring Server is Online
  📍  http://localhost:${PORT}
  ⏱️   ตรวจสอบทุก ${CHECK_INTERVAL / 60000} นาที
  =========================================
  `);
});

monitorTask();
setInterval(monitorTask, CHECK_INTERVAL);

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
