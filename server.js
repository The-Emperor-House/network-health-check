require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// --- นำเข้า Collectors ---
const { collectGBB100Status } = require("./collectors/GBB100Collector");
const { collectFortigateStatus } = require("./collectors/FortigateCollector");
const { collectM365Status } = require("./collectors/M365Collector");
const { runNetworkChecks } = require("./collectors/NetworkCollector");
const { collectUnifiHealth } = require("./collectors/UnifiCollector");

// --- นำเข้า Utils ---
const { 
    logReportAndCollectAlerts, 
    getOverallStats, 
    clearState 
} = require("./utils/reportUtils");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // รองรับการเชื่อมต่อจากภายนอกถ้าจำเป็น
});

const PORT = process.env.PORT || 3002;
const CHECK_INTERVAL = (process.env.CHECK_INTERVAL_MINUTES || 5) * 60 * 1000; 

// Middleware และ Static Files
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * 🛠️ ฟังก์ชันหลักสำหรับรัน Health Check
 */
async function monitorTask() {
    const timestamp = new Date().toLocaleString("th-TH");
    console.log(`\n🚀 [${timestamp}] เริ่มรอบการตรวจสอบสถานะระบบ...`);
    
    // 1. ล้างสถานะเก่าก่อนเริ่มรอบใหม่
    clearState(); 

    // 2. นิยามรายการที่ต้องตรวจสอบ
    const tasks = [
        { id: "GBB", fn: collectGBB100Status },
        { id: "Network", fn: runNetworkChecks },
        { id: "FortiGate", fn: collectFortigateStatus },
        { id: "Unifi", fn: collectUnifiHealth },
        { id: "M365", fn: collectM365Status }
    ];

    // 3. รันการตรวจสอบแบบ Parallel (ขนานกัน) 
    // ใช้ allSettled เพื่อให้ตัวที่พังไม่ขัดขวางตัวที่เหลือ
    const results = await Promise.allSettled(tasks.map(task => task.fn()));

    results.forEach((res, index) => {
        const taskId = tasks[index].id;
        if (res.status === "fulfilled" && res.value) {
            logReportAndCollectAlerts(res.value);
            console.log(`✅ ${taskId}: สำเร็จ`);
        } else {
            console.error(`❌ ${taskId}: เกิดข้อผิดพลาด ->`, res.reason || "ไม่ทราบสาเหตุ");
        }
    });

    // 4. ดึงข้อมูลสรุปสถิติทั้งหมด (Alerts + Results)
    const summary = getOverallStats();
    summary.lastUpdate = timestamp;

    // 5. ส่งข้อมูลไปที่ Dashboard ผ่าน Socket.io
    io.emit("update-dashboard", summary);
    console.log(`📊 ตรวจสอบเสร็จสิ้น: พบปัญหา ${summary.alerts.length} รายการ`);
}

// --- Event Handlers สำหรับ Socket.io ---
io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // ส่งข้อมูลล่าสุดให้ทันทีที่เชื่อมต่อ
    const currentStatus = getOverallStats();
    currentStatus.lastUpdate = new Date().toLocaleString("th-TH");
    socket.emit("update-dashboard", currentStatus);
});

// --- API Endpoints ---

// ดึงสถานะปัจจุบัน
app.get("/api/status", (req, res) => {
    res.json(getOverallStats());
});

// สั่งให้รันการตรวจสอบทันที (Manual Trigger)
app.post("/api/trigger-check", async (req, res) => {
    console.log("🔘 Manual Refresh Triggered via API");
    monitorTask(); // รันฟังก์ชันตรวจสอบทันที
    res.json({ success: true, message: "Manual check started" });
});

// --- เริ่มต้นการทำงาน ---
server.listen(PORT, () => {
    console.log(`
    =========================================
    🚀 Monitoring Server Online!
    📍 URL: http://localhost:${PORT}
    ⏱️ Interval: ทุก ${CHECK_INTERVAL / 60000} นาที
    =========================================
    `);
});

// เริ่มต้นรันครั้งแรก
monitorTask();

// ตั้งเวลาการทำงานรอบถัดไป
setInterval(monitorTask, CHECK_INTERVAL);

// จัดการกรณี Process ปิดตัวลง
process.on('SIGTERM', () => {
    console.log('Stopping server...');
    server.close(() => process.exit(0));
});