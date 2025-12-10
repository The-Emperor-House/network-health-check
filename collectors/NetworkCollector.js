const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');
const config = require('../config');

// --- 1. ฟังก์ชันช่วยเหลือ (Private Helper) ---
const isWin = process.platform === "win32";

// ฟังก์ชันสำหรับเลือก Emoji ตามประเภทการตรวจสอบ
function getEmoji(check) {
    if (check.category === 'Printer Device') return '🖨️'; // เครื่องพิมพ์
    if (check.type === 'Web') return '🌐'; // เว็บไซต์
    if (check.type === 'TCP') return '🔌'; // TCP Port
    if (check.name.includes('Router') || check.name.includes('Firewall') || check.name.includes('Gateway')) return '🛡️'; // อุปกรณ์เครือข่ายหลัก
    if (check.name.includes('Domain Controller') || check.name.includes('DNS')) return '💻'; // เซิร์ฟเวอร์/บริการหลัก
    if (check.name.includes('Internet')) return '🌍'; // ตรวจสอบอินเทอร์เน็ต
    return '🔗'; // Default: การเชื่อมต่อทั่วไป
}

// --- 2. ฟังก์ชันตรวจสอบแต่ละประเภท (Pure Functions) ---

function runPingCheck(target) {
    return new Promise((resolve) => {
        const pingCommand = isWin 
            ? `ping ${target.target} -n 1 -w 1000`
            : `ping -c 1 -W 1 ${target.target}`;
        
        exec(pingCommand, (error, stdout) => {
            let status = 'DOWN';
            let detail = 'Timed Out';
            
            if (stdout.includes(isWin ? 'Reply from' : 'bytes from')) {
                status = 'UP';
                const matchTime = stdout.match(/time[=<](\d+)ms/);
                detail = matchTime ? `${matchTime[1]} ms` : 'Reply';
            } else if (stdout.includes('Unreachable')) {
                detail = 'Host Unreachable';
            } else if (stdout.includes('100% packet loss')) {
                detail = 'Timed Out';
            }

            // Printer status (Ping) is converted to UP_W if DOWN
            if (status === 'DOWN' && target.category === 'Printer Device') {
                status = 'UP_W'; 
                detail = detail.includes('Timed Out') ? 'Timed Out (Possible Power Off)' : detail;
            }

            resolve({ status, detail });
        });
    });
}

function runWebAccessCheck(target) {
    return new Promise((resolve) => {
        const urlObj = new URL(target.url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        const startTime = process.hrtime();
        
        const req = protocol.get(target.url, { timeout: 5000, rejectUnauthorized: false }, (res) => { 
            const diff = process.hrtime(startTime);
            const latencyMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(0);
            
            let status = 'DOWN';
            const statusCode = res.statusCode;
            let explanation = '';

            if (statusCode >= 200 && statusCode < 400) {
                status = 'UP';
            } else if (statusCode === 429) { 
                status = 'UP_W'; 
                explanation = ' (Rate Limited)';
            } else if (statusCode === 404) {
                 status = 'DOWN'; // Not Found
                 explanation = ' (Resource Not Found)';
            }
            
            const detail = `Status: ${statusCode}${explanation} (${latencyMs} ms)`;
            res.resume(); 
            req.end();
            resolve({ status, detail });
        });

        req.on('error', (e) => {
            resolve({ status: 'DOWN', detail: `Error: ${e.code || 'Connection Failed'}` });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'DOWN', detail: 'Timed Out (5000 ms)' });
        });
    });
}

function runTcpPortCheck(target) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const startTime = process.hrtime();
        
        socket.setTimeout(3000); 

        const cleanupAndResolve = (status, detail) => {
            if (socket) socket.destroy();
            resolve({ status, detail });
        };

        socket.on('connect', () => {
            const diff = process.hrtime(startTime);
            const latencyMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(0);
            cleanupAndResolve('UP', `Port Open (${latencyMs} ms)`);
        });

        socket.on('timeout', () => {
            cleanupAndResolve('DOWN', 'Timed Out (3000 ms)');
        });

        socket.on('error', (e) => {
            cleanupAndResolve('DOWN', `Error: ${e.code || 'Connection Refused'}`);
        });

        socket.connect(target.port, target.target);
    });
}

// --- 3. ฟังก์ชันหลักสำหรับรวมผลลัพธ์ (Main Collector Function) ---

async function runNetworkChecks() {
    let overallStatus = 'UP';
    
    const networkReport = {
        name: "Basic Connectivity",
        category: "Network & Server Health (Ping/Web/TCP)",
        status: "UP",
        details: []
    };
    
    const categoryStatusMap = new Map();

    // รัน Check ทั้งหมดพร้อมกัน
    const checkPromises = config.NETWORK_CHECKS.map(check => {
        let checkPromise;
        if (check.type === "Ping") {
            checkPromise = runPingCheck(check);
        } else if (check.type === "Web") {
            checkPromise = runWebAccessCheck(check);
        } else if (check.type === "TCP") {
            checkPromise = runTcpPortCheck(check);
        } else {
            checkPromise = Promise.resolve({ status: 'DOWN', detail: `Unknown check type: ${check.type}` });
        }

        return checkPromise.then(result => ({ ...check, result }));
    });

    const results = await Promise.all(checkPromises);

    // 1. รวบรวมผลลัพธ์ทั้งหมด และอัปเดตสถานะที่แย่ที่สุดในแต่ละ Category
    results.forEach(checkResult => {
        const category = checkResult.category || 'Other';
        const resultStatus = checkResult.result.status;

        const currentCategoryStatus = categoryStatusMap.get(category) || 'UP';
        let newCategoryStatus = currentCategoryStatus;

        // DOWN > UP_W > UNKNOWN > UP
        if (resultStatus === 'DOWN') {
            newCategoryStatus = 'DOWN';
        } else if (resultStatus === 'UP_W' && newCategoryStatus !== 'DOWN') {
            newCategoryStatus = 'UP_W';
        } else if (resultStatus === 'UNKNOWN' && newCategoryStatus === 'UP') {
             newCategoryStatus = 'UNKNOWN';
        }
        categoryStatusMap.set(category, newCategoryStatus);
    });

    // 2. เรียงลำดับผลลัพธ์และใส่ Header/Detail
    let currentCategory = null;
    
    // เรียงตาม Category และ Name
    const sortedResults = results.sort((a, b) => {
        if (a.category !== b.category) {
            return (a.category > b.category) ? 1 : -1;
        }
        return (a.name > b.name) ? 1 : -1;
    });

    sortedResults.forEach(checkResult => {
        const check = checkResult;
        const result = checkResult.result;
        const category = check.category;

        if (category !== currentCategory) {
            currentCategory = category;
            
            // Header: ใช้สถานะเป็น HEADER เสมอ เพื่อให้ logReport ไม่แสดง icon เตือนซ้ำ
            networkReport.details.push({
                check: "Header", 
                result: `กลุ่มการตรวจสอบ: ${category}`,
                status: "HEADER" 
            });
        }
        
        const emoji = getEmoji(check);

        const detailEntry = {
            check: `${emoji} ${check.name}`, 
            result: result.detail,
            status: result.status
        };
        networkReport.details.push(detailEntry);
        
        // อัปเดตสถานะรวมของรายงาน (ใช้สถานะที่แย่ที่สุด)
        if (result.status === 'DOWN') {
            overallStatus = 'DOWN';
        } else if (result.status === 'UP_W' && overallStatus !== 'DOWN') {
            overallStatus = 'UP_W';
        }
    });

    // เพิ่ม หมายเหตุ (INFO)
    networkReport.details.push({
        check: "หมายเหตุ",
        result: "การตรวจสอบ Network ดำเนินการแบบพร้อมกัน (Concurrent)",
        status: "INFO" 
    });
    
    networkReport.status = overallStatus;
    return networkReport;
}

module.exports = { runNetworkChecks };