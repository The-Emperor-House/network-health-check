const axios = require('axios');
const config = require('../config');
const https = require('https');
const dns = require('dns');

// บังคับให้ Node.js เลือก IPv4 ก่อน (ป้องกัน Mac พยายามหา IPv6 จน Timeout)
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const WARNING_DISCONNECTED_DEVICES = 1;
const WARNING_TX_RETRIES_RATE = 10;
const WARNING_CHANNEL_UTILIZATION = 60;

async function collectUnifiHealth() {
    const unifi = config.UNIFI;
    let overallStatus = 'UP';
    let sessionCookie = null;
    let foundPerformanceIssue = false;
    
    const report = { name: "Unifi Network Controller", category: "Network Health", status: "UP", details: [] };
    
    const API_BASE_URL = `https://${unifi.IP}:${unifi.PORT}/api`;
    
    const instance = axios.create({
        baseURL: API_BASE_URL,
        timeout: 20000, // เพิ่มเป็น 20 วิ เผื่อ Network Handshake
        httpsAgent: new https.Agent({ 
            rejectUnauthorized: false,
            // ข้ามการเช็กชื่อ Hostname ใน Certificate (ลดภาระ Mac)
            checkServerIdentity: () => undefined,
            keepAlive: true
        }),
        proxy: false // ป้องกันการวิ่งผ่าน System Proxy ของ Mac
    });

    try {
        // 1. Login
        const loginRes = await instance.post('/login', {
            username: unifi.USERNAME,
            password: unifi.PASSWORD,
            remember: true
        });

        if (!loginRes.headers['set-cookie']) throw new Error("No cookie received");
        sessionCookie = loginRes.headers['set-cookie'].join('; ');

        report.details.push({ check: "🌐 Controller API Login", result: "เชื่อมต่อสำเร็จ", status: "UP" });

        // 2. Device Stat
        const deviceRes = await instance.get('/s/default/stat/device', { headers: { 'Cookie': sessionCookie } });
        const devices = deviceRes.data.data;
        
        // Check Disconnected
        const disconnected = devices.filter(d => d.state !== 1 && d.state !== 2);
        if (disconnected.length >= WARNING_DISCONNECTED_DEVICES) {
            overallStatus = 'UP_W';
            report.details.push({ check: "🚨 Disconnected Devices", result: `${disconnected.length} อุปกรณ์หลุด`, status: "UP_W" });
        } else {
            report.details.push({ check: "✅ Disconnected Devices", result: `ปกติ (รวม ${devices.length} อุปกรณ์)`, status: "UP" });
        }

        // Header สำหรับ AP
        report.details.push({ check: "Header", result: "📶 รายละเอียดสถานะ Access Point", status: "HEADER" });

        devices.filter(d => d.type === 'uap' || d.type === 'ugw').forEach(ap => {
            let apStatus = 'UP';
            const txRetriesRate = (ap.tx_retries / (ap.tx_bytes + ap.tx_retries) * 100 || 0).toFixed(1);
            const radio5G = ap.radio_table_stats?.na?.cu || 0;
            const radio2G = ap.radio_table_stats?.ng?.cu || 0;
            const maxUtil = Math.max(radio5G, radio2G);

            let warnings = [];
            if (txRetriesRate > WARNING_TX_RETRIES_RATE) warnings.push(`Retries ${txRetriesRate}%`);
            if (maxUtil > WARNING_CHANNEL_UTILIZATION) warnings.push(`Util ${maxUtil}%`);

            if (warnings.length > 0) { apStatus = 'UP_W'; foundPerformanceIssue = true; }
            
            report.details.push({
                check: `📶 AP: ${ap.name || ap.mac}`,
                result: warnings.length > 0 ? warnings.join(' | ') : `Clients: ${ap.num_sta || 0} | Util: ${maxUtil}%`,
                status: apStatus
            });
        });

    } catch (error) {
        overallStatus = 'DOWN';
        report.details.push({ check: "❌ Unifi Connection", result: `Error: ${error.message}`, status: "DOWN" });
    } finally {
        if (sessionCookie) await instance.post('/logout', {}, { headers: { 'Cookie': sessionCookie } }).catch(() => {});
    }
    
    report.status = (foundPerformanceIssue || overallStatus === 'UP_W') ? 'UP_W' : overallStatus;
    return report;
}

module.exports = { collectUnifiHealth };