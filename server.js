require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// นำเข้า Collectors และ Utils
const { collectGBB100Status } = require("./collectors/GBB100Collector");
const { collectFortigateStatus } = require("./collectors/FortigateCollector");
const { collectM365Status } = require("./collectors/M365Collector");
const { runNetworkChecks } = require("./collectors/NetworkCollector");
const { collectUnifiHealth } = require("./collectors/UnifiCollector");
const { 
    logReportAndCollectAlerts, 
    getOverallResults, 
    getOverallAlerts, 
    clearState 
} = require("./utils/reportUtils");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const CHECK_INTERVAL = 5 * 60 * 1000; // รันทุก 5 นาที

app.use(express.static(path.join(__dirname, "public")));

/**
 * ฟังก์ชันหลักที่รันเป็น Background Task
 */
async function monitorTask() {
    console.log(`\n🚀 [${new Date().toLocaleString()}] Starting Background Health Check...`);
    clearState(); // [cite: 2026-02-23]

    const collectors = [
        collectGBB100Status(),
        runNetworkChecks(),
        collectFortigateStatus(),
        collectUnifiHealth(),
        collectM365Status(),
    ];
    
    const results = await Promise.allSettled(collectors);

    results.forEach((res) => {
        if (res.status === "fulfilled" && res.value) {
            logReportAndCollectAlerts(res.value); // [cite: 2026-02-23]
        }
    });

    const data = {
        results: getOverallResults(),
        alerts: getOverallAlerts(),
        lastUpdate: new Date().toLocaleString("th-TH")
    };

    // ส่งข้อมูลใหม่ไปที่หน้าเว็บทันทีผ่าน Socket.io
    io.emit("update-dashboard", data);
    console.log("📡 Data pushed to dashboard.");
}

// รันครั้งแรกทันทีที่เปิด Server
monitorTask();
// ตั้งเวลาทำงานรอบถัดไป
setInterval(monitorTask, CHECK_INTERVAL);

// API สำหรับดึงข้อมูลล่าสุด (เผื่อหน้าเว็บเพิ่งโหลด)
app.get("/api/status", (req, res) => {
    res.json({
        results: getOverallResults(),
        alerts: getOverallAlerts(),
        lastUpdate: new Date().toLocaleString("th-TH")
    });
});

server.listen(PORT, () => {
    console.log(`✅ Monitoring Web App is running on http://localhost:${PORT}`);
});