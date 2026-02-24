const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');
const config = require('../config');

const isWin = process.platform === "win32";

function getEmoji(check) {
    if (check.category === 'Printer Device') return '🖨️';
    if (check.type === 'Web') return '🌐';
    if (check.type === 'TCP') return '🔌';
    if (check.name.includes('Router') || check.name.includes('Firewall') || check.name.includes('Gateway')) return '🛡️';
    if (check.name.includes('Domain Controller') || check.name.includes('DNS')) return '💻';
    if (check.name.includes('Internet')) return '🌍';
    return '🔗';
}

function runPingCheck(target) {
    return new Promise((resolve) => {
        // Mac/Linux ใช้ -W (ms) ส่วน Windows ใช้ -w (ms)
        const pingCommand = isWin 
            ? `ping ${target.target} -n 1 -w 1000`
            : `ping -c 1 -W 1000 ${target.target}`;
        
        exec(pingCommand, (error, stdout, stderr) => {
            let status = 'DOWN';
            let detail = 'Timed Out';
            
            // ดักจับทั้ง 'Reply from' (Win) และ 'bytes from' (Mac/Unix)
            const isSuccess = stdout.toLowerCase().includes('reply from') || stdout.toLowerCase().includes('bytes from');

            if (isSuccess) {
                status = 'UP';
                // Regex ใหม่: รองรับเลขทศนิยมและเครื่องหมาย < ของ Windows
                const matchTime = stdout.match(/time[=<](\d+(?:\.\d+)?)\s?ms/i);
                detail = matchTime ? `${matchTime[1]} ms` : 'Reply';
            } else if (stdout.includes('Unreachable') || stderr.includes('Unreachable')) {
                detail = 'Host Unreachable';
            } else if (error || stdout.includes('100% packet loss')) {
                detail = 'Timed Out / Error';
            }

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
        
        const req = protocol.get(target.url, { 
            timeout: 5000, 
            rejectUnauthorized: false 
        }, (res) => { 
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
            }
            
            const detail = `Status: ${statusCode}${explanation} (${latencyMs} ms)`;
            res.resume(); 
            resolve({ status, detail });
        });

        req.on('error', (e) => resolve({ status: 'DOWN', detail: `Error: ${e.code}` }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 'DOWN', detail: 'Timed Out' }); });
    });
}

function runTcpPortCheck(target) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const startTime = process.hrtime();
        socket.setTimeout(3000); 

        socket.on('connect', () => {
            const diff = process.hrtime(startTime);
            const latencyMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(0);
            socket.destroy();
            resolve({ status: 'UP', detail: `Port Open (${latencyMs} ms)` });
        });

        socket.on('timeout', () => { socket.destroy(); resolve({ status: 'DOWN', detail: 'Timed Out' }); });
        socket.on('error', (e) => { socket.destroy(); resolve({ status: 'DOWN', detail: `Error: ${e.code}` }); });
        socket.connect(target.port, target.target);
    });
}

async function runNetworkChecks() {
    let overallStatus = 'UP';
    const networkReport = { name: "Basic Connectivity", category: "Network Health", status: "UP", details: [] };
    const categoryStatusMap = new Map();

    const results = await Promise.all(config.NETWORK_CHECKS.map(async (check) => {
        let res;
        if (check.type === "Ping") res = await runPingCheck(check);
        else if (check.type === "Web") res = await runWebAccessCheck(check);
        else if (check.type === "TCP") res = await runTcpPortCheck(check);
        return { ...check, result: res };
    }));

    // Logic จัดกลุ่ม Category เหมือนเดิมของคุณพิมุกต์
    const sortedResults = results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    let currentCategory = null;

    sortedResults.forEach(item => {
        if (item.category !== currentCategory) {
            currentCategory = item.category;
            networkReport.details.push({ check: "Header", result: `กลุ่ม: ${currentCategory}`, status: "HEADER" });
        }
        networkReport.details.push({ check: `${getEmoji(item)} ${item.name}`, result: item.result.detail, status: item.result.status });
        if (item.result.status === 'DOWN') overallStatus = 'DOWN';
        else if (item.result.status === 'UP_W' && overallStatus !== 'DOWN') overallStatus = 'UP_W';
    });

    networkReport.status = overallStatus;
    return networkReport;
}

module.exports = { runNetworkChecks };