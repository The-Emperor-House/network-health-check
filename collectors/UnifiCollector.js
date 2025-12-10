const axios = require('axios');
const config = require('../config');
const https = require('https'); 
const { Agent } = https;

// *** เกณฑ์การแจ้งเตือน (อ้างอิงจากมาตรฐานอุตสาหกรรม Wi-Fi) ***
const WARNING_DISCONNECTED_DEVICES = 1;
const WARNING_TX_RETRIES_RATE = 10;     // อัตราส่งซ้ำสูงกว่า 10%
const WARNING_CHANNEL_UTILIZATION = 60; // การใช้งานช่องสัญญาณเกิน 60%

// Helper function: จัดเรียง AP ตามชื่อ
function sortDevicesByName(devices) {
    devices.sort((a, b) => {
        const nameA = a.name ? a.name.toUpperCase() : a.mac; 
        const nameB = b.name ? b.name.toUpperCase() : b.mac;
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });
}

async function collectUnifiHealth() {
    const unifi = config.UNIFI;
    let overallStatus = 'UP';
    let sessionCookie = null;
    let foundPerformanceIssue = false;
    
    const report = {
        name: "Unifi Network Controller",
        category: "Network Health",
        status: "UP", 
        details: []
    };
    
    // --- Configuration Check ---
    if (!unifi.IP || !unifi.PORT || !unifi.USERNAME || !unifi.PASSWORD) {
         return {
            ...report,
            status: 'DOWN',
            details: [{ check: '❌ Configuration Error', result: 'UNIFI config must be set', status: 'DOWN' }]
        };
    }
    
    const CONTROLLER_URL = `https://${unifi.IP}:${unifi.PORT}`;
    const API_BASE_URL = `${CONTROLLER_URL}/api`;
    
    const instance = axios.create({
        baseURL: API_BASE_URL,
        timeout: 15000, 
        httpsAgent: new Agent({ rejectUnauthorized: false }) 
    });

    try {
        // --- 1. Login เพื่อสร้าง Session ---
        const loginPayload = {
            username: unifi.USERNAME,
            password: unifi.PASSWORD,
            remember: true
        };
        
        const loginResponse = await instance.post('/login', loginPayload);

        if (loginResponse.status !== 200 || !loginResponse.headers['set-cookie']) {
            throw new Error(`Login Failed. Status: ${loginResponse.status}. Check credentials/URL.`);
        }
        
        sessionCookie = loginResponse.headers['set-cookie'].join('; ');

        report.details.push({ 
            check: "🌐 Controller API Login", 
            result: `เชื่อมต่อและ Login สำเร็จ`, 
            status: "UP" 
        });

        // --- 2. ดึงข้อมูลอุปกรณ์ทั้งหมดเพื่อตรวจสอบ Device Health และ Performance ---
        const deviceResponse = await instance.get('/s/default/stat/device', {
            headers: { 'Cookie': sessionCookie, 'X-Csrf-Token': 'unifi-token' }
        });
        
        if (deviceResponse.status !== 200 || !deviceResponse.data.data) {
             throw new Error("Failed to retrieve device status.");
        }
        
        const devices = deviceResponse.data.data;
        
        // --- 2a. Device Health Check (Disconnected) ---
        const disconnectedDevices = devices.filter(d => d.state !== 1 && d.state !== 2); // 1=Connected, 2=Adopting
        
        if (disconnectedDevices.length >= WARNING_DISCONNECTED_DEVICES) {
            overallStatus = 'UP_W';
            report.details.push({
                check: "🚨 Disconnected Devices",
                result: `${disconnectedDevices.length} อุปกรณ์หลุดการเชื่อมต่อ`,
                status: "UP_W"
            });
        } else {
            report.details.push({
                check: "✅ Disconnected Devices",
                result: `พบ 0 อุปกรณ์หลุดการเชื่อมต่อ (รวม ${devices.length} อุปกรณ์)`,
                status: "UP"
            });
        }
        
        // --- 2b. Detailed AP Performance Check (แสดงทุก AP) ---
        let apDevices = devices.filter(d => d.type === 'uap' || d.type === 'ugw'); 

        sortDevicesByName(apDevices);
        
        report.details.push({
            check: "Header", 
            result: "📶 สถานะ Health Check รายละเอียด AP/Gateway",
            status: "HEADER" 
        });

        apDevices.forEach(ap => {
            let apStatus = 'UP';
            let warnings = [];
            
            // 1. TX Retries Check
            const txRetries = ap.tx_retries || 0;
            const txBytes = ap.tx_bytes || 0;

            const totalTx = txBytes + txRetries;
            const txRetriesRate = totalTx > 0 ? (txRetries / totalTx) * 100 : 0;
            
            if (txRetriesRate > WARNING_TX_RETRIES_RATE) {
                warnings.push(`Retries ${txRetriesRate.toFixed(1)}% (สูงกว่า ${WARNING_TX_RETRIES_RATE}%)`);
            }
            
            // 2. Channel Utilization Check
            const radio5GUtil = ap.radio_table_stats?.na?.cu || 0;
            const radio2GUtil = ap.radio_table_stats?.ng?.cu || 0;
            const maxUtilization = Math.max(radio5GUtil, radio2GUtil);

            if (maxUtilization > WARNING_CHANNEL_UTILIZATION) {
                 warnings.push(`Util ${maxUtilization}% (สูงกว่า ${WARNING_CHANNEL_UTILIZATION}%)`);
            }
            
            // สรุปสถานะ AP แต่ละตัว
            if (warnings.length > 0) {
                apStatus = 'UP_W';
                foundPerformanceIssue = true; // ตั้งค่า Flag สำหรับสถานะรวม
            } 
            
            const clientCount = ap.num_sta || 0;
            const apResult = warnings.length > 0 
                ? warnings.join(' | ') 
                : `Clients: ${clientCount} | Retries: ${txRetriesRate.toFixed(1)}% | Util: ${maxUtilization}%`;

            // เพิ่มรายละเอียดของ AP ทุกตัว และใช้ Emoji 📶
            report.details.push({
                check: `📶 AP Health: ${ap.name || ap.mac}`,
                result: apResult,
                status: apStatus
            });
        });
        
        // --- 3. ดึงจำนวน Client และเทียบกับ Threshold ---
        const clientResponse = await instance.get('/s/default/stat/sta', {
            headers: { 'Cookie': sessionCookie }
        });
        
        const clientCount = clientResponse.data.data.length;
        let clientStatus = 'INFO';
        let clientDetail = `Client เชื่อมต่อ: ${clientCount} / Threshold: ${unifi.CLIENT_THRESHOLD}`;

        if (clientCount > unifi.CLIENT_THRESHOLD) {
             clientStatus = 'UP_W';
             // อัปเดต overallStatus เป็น UP_W หากยังไม่เป็น DOWN
             if (overallStatus !== 'DOWN') overallStatus = 'UP_W'; 
             clientDetail = `Client เชื่อมต่อ: ${clientCount} (เกิน Threshold ${unifi.CLIENT_THRESHOLD}) - เครือข่ายอาจช้าลง`;
        }

        report.details.push({
            check: "👥 Active Wireless Clients (รวม)",
            result: clientDetail,
            status: clientStatus
        });

    } catch (error) {
        overallStatus = 'DOWN';
        report.status = 'DOWN';
        report.details.push({ 
            check: "❌ Unifi Connection Test", 
            result: `Failed: ${error.message || 'Connection Error'}`, 
            status: "DOWN" 
        });
    } finally {
        // --- 4. Logout (สำคัญมาก) ---
        if (sessionCookie) {
             try {
                 await instance.post('/logout', {}, { headers: { 'Cookie': sessionCookie } });
             } catch (e) {
                 // Ignore logout failure
             }
        }
    }
    
    // ตั้งสถานะรวมเป็น Warning หากมีรายการย่อยเป็น Warning
    if (foundPerformanceIssue || overallStatus === 'UP_W') {
        report.status = 'UP_W';
    } else {
        report.status = overallStatus;
    }

    return report;
}

module.exports = { collectUnifiHealth };