require("dotenv").config();
const axios = require("axios");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function collectFortigateStatus() {
    const host = process.env.FORTIGATE_IP; // 192.168.9.1:11443
    const baseUrl = `https://${host}/api/v2/monitor`;
    const params = { access_token: process.env.FORTIGATE_API_KEY };

    try {
        // ดึง Resource Usage (CPU/RAM/Session)
        const resUsage = await axios.get(`${baseUrl}/system/resource/usage`, { params, httpsAgent: agent, timeout: 5000 });
        const results = resUsage.data.results;

        // เจาะเข้าโครงสร้าง Array ตาม JSON ของ FortiOS v7.2.13
        const cpu = results.cpu?.[0]?.current ?? 0;
        const mem = results.mem?.[0]?.current ?? 0;
        const sessions = results.session?.[0]?.current ?? 0;
        // ดึงค่าสูงสุด (Peak) จากประวัติ 1 นาทีล่าสุด
        const maxSessions = results.session?.[0]?.historical?.["1-min"]?.max ?? 0; 
        const serial = resUsage.data.serial || "FGT60F";
        const version = resUsage.data.version || "v7.2.13";

        const details = [
            { 
                check: "CPU Usage", 
                result: `${cpu}%`, 
                status: cpu < 80 ? "UP" : "UP_W",
                percent: cpu 
            },
            { 
                check: "Memory Usage", 
                result: `${mem}%`, 
                status: mem < 85 ? "UP" : "UP_W",
                percent: mem 
            },
            { 
                check: "Active Sessions", 
                result: `${sessions.toLocaleString()} (Peak: ${maxSessions})`, 
                status: "UP" 
            },
            { 
                check: "Firmware", 
                result: version, 
                status: "UP" 
            }
        ];

        return {
            name: `FortiGate (${serial})`,
            status: details.some(d => d.status === "DOWN") ? "DOWN" : (details.some(d => d.status === "UP_W") ? "UP_W" : "UP"),
            details: details
        };

    } catch (error) {
        console.error("❌ FortiGate API Error:", error.message);
        return {
            name: "FortiGate Firewall",
            status: "DOWN",
            details: [{ check: "Connection", result: "API Error", status: "DOWN" }]
        };
    }
}

module.exports = { collectFortigateStatus };