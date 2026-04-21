const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const isWin = process.platform === "win32";

function runPingCheck(target) {
    return new Promise((resolve) => {
        if (!target.target) return resolve({ status: 'DOWN', detail: 'No target IP/Host' });

        const pingCommand = isWin 
            ? `ping ${target.target} -n 1 -w 1500`
            : `ping -c 1 -W 2 ${target.target}`;
        
        exec(pingCommand, (error, stdout, stderr) => {
            let status = 'DOWN';
            let detail = 'Timed Out';
            const out = (stdout + stderr).toLowerCase();
            
            // ปรับปรุงการตรวจสอบ Success ให้ครอบคลุมหลายภาษา
            const isSuccess = out.includes('reply from') || out.includes('bytes from') || out.includes('ttl=');

            if (isSuccess) {
                status = 'UP';
                const matchTime = out.match(/time[=<](\d+(?:\.\d+)?)\s?ms/i);
                detail = matchTime ? `${matchTime[1]} ms` : 'Reply OK';
            } else if (out.includes('unreachable')) {
                detail = 'Unreachable';
            }

            // เงื่อนไขสำหรับ Printer (มักจะ Sleep เพื่อประหยัดไฟ)
            if (status === 'DOWN' && target.category === 'Printer Device') {
                status = 'UP_W'; 
                detail = 'Off/Sleep';
            }

            resolve({ status, detail });
        });
    });
}

function runWebAccessCheck(target) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(target.url);
            const protocol = urlObj.protocol === 'https:' ? https : http;
            const startTime = process.hrtime();
            
            const req = protocol.get(target.url, { 
                timeout: 8000, 
                rejectUnauthorized: false 
            }, (res) => { 
                const diff = process.hrtime(startTime);
                const latencyMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(0);
                
                let status = 'DOWN';
                const code = res.statusCode;

                if (code >= 200 && code < 400) status = 'UP';
                else if (code === 429) status = 'UP_W';
                
                res.resume(); 
                resolve({ status, detail: `HTTP ${code} (${latencyMs} ms)` });
            });

            req.on('error', (e) => resolve({ status: 'DOWN', detail: `Conn Error: ${e.code}` }));
            req.on('timeout', () => { req.destroy(); resolve({ status: 'DOWN', detail: 'Timed Out' }); });
        } catch (e) {
            resolve({ status: 'DOWN', detail: 'Invalid URL' });
        }
    });
}

function runTcpPortCheck(target) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const startTime = process.hrtime();
        
        socket.setTimeout(5000); 
        socket.on('connect', () => {
            const diff = process.hrtime(startTime);
            const latencyMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(0);
            socket.destroy();
            resolve({ status: 'UP', detail: `Open (${latencyMs} ms)` });
        });
        socket.on('timeout', () => { socket.destroy(); resolve({ status: 'DOWN', detail: 'Timeout' }); });
        socket.on('error', (e) => { socket.destroy(); resolve({ status: 'DOWN', detail: `Closed (${e.code})` }); });
        socket.connect(target.port, target.target);
    });
}

module.exports = { runPingCheck, runWebAccessCheck, runTcpPortCheck };