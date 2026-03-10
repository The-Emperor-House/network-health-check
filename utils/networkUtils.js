const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const isWin = process.platform === "win32";

/**
 * ฟังก์ชันสำหรับ Ping
 */
function runPingCheck(target) {
    return new Promise((resolve) => {
        const pingCommand = isWin 
            ? `ping ${target.target} -n 1 -w 1000`
            : `ping -c 1 -W 1000 ${target.target}`;
        
        exec(pingCommand, (error, stdout, stderr) => {
            let status = 'DOWN';
            let detail = 'Timed Out';
            const isSuccess = stdout.toLowerCase().includes('reply from') || stdout.toLowerCase().includes('bytes from');

            if (isSuccess) {
                status = 'UP';
                const matchTime = stdout.match(/time[=<](\d+(?:\.\d+)?)\s?ms/i);
                detail = matchTime ? `${matchTime[1]} ms` : 'Reply';
            } else if (stdout.includes('Unreachable') || stderr.includes('Unreachable')) {
                detail = 'Host Unreachable';
            } else if (error || stdout.includes('100% packet loss')) {
                detail = 'Timed Out / Error';
            }

            // เงื่อนไขพิเศษสำหรับ Printer
            if (status === 'DOWN' && target.category === 'Printer Device') {
                status = 'UP_W'; 
                detail = detail.includes('Timed Out') ? 'Timed Out (Possible Power Off)' : detail;
            }

            resolve({ status, detail });
        });
    });
}

/**
 * ฟังก์ชันสำหรับตรวจสอบ Web Access (HTTP/HTTPS)
 */
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

/**
 * ฟังก์ชันสำหรับตรวจสอบ TCP Port
 */
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

module.exports = { runPingCheck, runWebAccessCheck, runTcpPortCheck };