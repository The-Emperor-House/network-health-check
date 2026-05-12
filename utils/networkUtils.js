const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const isWin = process.platform === "win32";

// ฟังก์ชันตรวจเช็กการตอบสนองของอุปกรณ์ด้วยคำสั่ง ping
function runPingCheck(target) {
    return new Promise((resolve) => {
        // 1. พยายามดึงจากคีย์มาตรฐานก่อน
        let destination = target.target || target.host || target.ip || target.url || target.address;

        // 2. 🚨 ถ้าระบบยังหาเลข IP/Host ไม่เจอ (เพราะชื่อคีย์ใน config.js ไม่ตรง)
        // เราจะทำการแกะเอาจากชื่อของอุปกรณ์ (target.name) เช่น "Ping 8.8.8.8" หรือ "Ping Firewall"
        if (!destination && target.name) {
            const nameLower = target.name.toLowerCase();
            if (nameLower.includes('ping ')) {
                // ตัดคำว่า 'ping ' ออก แล้วเอาคำข้างหลังมาเป็นเป้าหมายในการปิงแทนทันที
                destination = target.name.replace(/^[Pp]ing\s+/, '').trim();
                
                // ถ้ายัดเยียดวงเล็บมาด้วย เช่น "8.8.8.8 (Internet Check)" ให้ตัดเหลือแค่ 8.8.8.8
                if (destination.includes('(')) {
                    destination = destination.split('(')[0].trim();
                }
            }
        }

        // ถ้าปลายทางเป็น URL ให้ถอดเอาเฉพาะ hostname ออกมาปิง
        if (destination && (destination.startsWith('http://') || destination.startsWith('https://'))) {
            try {
                const urlObj = new URL(destination);
                destination = urlObj.hostname;
            } catch (e) {}
        }

        // หากพยายามทุกวิถีทางแล้วยังไม่มีเป้าหมาย ให้ส่งกลับว่า DOWN
        if (!destination) {
            return resolve({ status: 'DOWN', detail: 'No target IP/Host' });
        }

        // 3. ใช้สเปคคำสั่งปิงมาตรฐานที่ทดสอบแล้วว่าผ่านบน Mac ของพิมุกต์แน่ๆ
        const pingCommand = isWin 
            ? `ping ${destination} -n 1 -w 1500`
            : `ping -c 1 ${destination}`;
        
        exec(pingCommand, (error, stdout, stderr) => {
            let status = 'DOWN';
            let detail = 'Timed Out';
            
            const out = (stdout + stderr).toLowerCase();
            
            // 4. เช็กคีย์เวิร์ดความสำเร็จตามที่ stdout ของพิมุกต์พ่นออกมาเป๊ะๆ (คำว่า 'bytes from')
            const isSuccess = out.includes('bytes from') || out.includes('ttl=') || out.includes('reply from');

            if (isSuccess && !out.includes('100% packet loss')) {
                status = 'UP';
                // ดึงค่าความเร็วหน่วย ms ออกมาจากข้อความตอบรับ
                const matchTime = out.match(/time[=< ](\d+(?:\.\d+)?)\s*ms/i);
                detail = matchTime ? `${matchTime[1]} ms` : 'Reply OK';
            } else if (out.includes('unreachable')) {
                detail = 'Unreachable';
            }

            // เงื่อนไขสำหรับกลุ่ม Printer ตัวเดิมของคุณพิมุกต์
            if (status === 'DOWN' && target.category === 'Printer Device') {
                status = 'UP_W'; 
                detail = 'Off/Sleep';
            }

            resolve({ status, detail });
        });
    });
}

// ฟังก์ชันตรวจเช็กการเข้าถึงหน้าเว็บ
function runWebAccessCheck(target) {
    return new Promise((resolve) => {
        try {
            const urlSource = target.url || target.target || target.host;
            if (!urlSource) return resolve({ status: 'DOWN', detail: 'No URL specified' });

            const urlObj = new URL(urlSource);
            const protocol = urlObj.protocol === 'https:' ? https : http;
            const startTime = process.hrtime();
            
            const req = protocol.get(urlSource, { 
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

// ฟังก์ชันตรวจเช็กการเชื่อมต่อผ่าน TCP Port
function runTcpPortCheck(target) {
    return new Promise((resolve) => {
        const destination = target.target || target.host || target.ip;
        const port = target.port;

        if (!destination || !port) {
            return resolve({ status: 'DOWN', detail: 'Missing Port or Host' });
        }

        const socket = new net.Socket();
        const startTime = process.hrtime();
        
        socket.setTimeout(5000); 
        
        socket.on('connect', () => {
            const diff = process.hrtime(startTime);
            const latencyMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(0);
            socket.destroy();
            resolve({ status: 'UP', detail: `Open (${latencyMs} ms)` });
        });
        
        socket.on('timeout', () => { 
            socket.destroy(); 
            resolve({ status: 'DOWN', detail: 'Timeout' }); 
        });
        
        socket.on('error', (e) => { 
            socket.destroy(); 
            resolve({ status: 'DOWN', detail: `Closed (${e.code})` }); 
        });
        
        socket.connect(port, destination);
    });
}

module.exports = { runPingCheck, runWebAccessCheck, runTcpPortCheck };