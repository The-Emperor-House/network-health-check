const { exec } = require("child_process");
const http = require("http");
const https = require("https");
const net = require("net");
const { URL } = require("url");

const isWin = process.platform === "win32";

/** ตรวจสอบด้วย Ping */
function runPingCheck(target) {
  return new Promise((resolve) => {
    let destination =
      target.target || target.host || target.ip || target.url || target.address;

    if (!destination && target.name) {
      const nameLower = target.name.toLowerCase();
      if (nameLower.includes("ping ")) {
        destination = target.name.replace(/^[Pp]ing\s+/, "").trim();
        if (destination.includes("(")) destination = destination.split("(")[0].trim();
      }
    }

    if (destination?.startsWith("http://") || destination?.startsWith("https://")) {
      try {
        destination = new URL(destination).hostname;
      } catch (_) {}
    }

    if (!destination) return resolve({ status: "DOWN", detail: "No target IP/Host" });

    const pingCommand = isWin
      ? `ping ${destination} -n 1 -w 1500`
      : `ping -c 1 ${destination}`;

    exec(pingCommand, (_err, stdout, stderr) => {
      const out = (stdout + stderr).toLowerCase();
      const isSuccess =
        out.includes("bytes from") || out.includes("ttl=") || out.includes("reply from");

      if (isSuccess && !out.includes("100% packet loss")) {
        const ms = out.match(/time[=< ](\d+(?:\.\d+)?)\s*ms/i);
        return resolve({ status: "UP", detail: ms ? `${ms[1]} ms` : "Reply OK" });
      }

      const detail = out.includes("unreachable") ? "Unreachable" : "Timed Out";
      const status = target.category === "Printer Device" ? "UP_W" : "DOWN";
      const printerDetail = target.category === "Printer Device" ? "Off/Sleep" : detail;

      resolve({ status, detail: printerDetail });
    });
  });
}

/** ตรวจสอบการเข้าถึงเว็บไซต์ */
function runWebAccessCheck(target) {
  return new Promise((resolve) => {
    try {
      const urlSource = target.url || target.target || target.host;
      if (!urlSource) return resolve({ status: "DOWN", detail: "No URL specified" });

      const urlObj = new URL(urlSource);
      const protocol = urlObj.protocol === "https:" ? https : http;
      const startTime = process.hrtime();

      const req = protocol.get(
        urlSource,
        { timeout: 8000, rejectUnauthorized: false },
        (res) => {
          const diff = process.hrtime(startTime);
          const ms = (diff[0] * 1000 + diff[1] / 1e6).toFixed(0);
          const code = res.statusCode;
          const status = code >= 200 && code < 400 ? "UP" : code === 429 ? "UP_W" : "DOWN";
          res.resume();
          resolve({ status, detail: `HTTP ${code} (${ms} ms)` });
        }
      );

      req.on("error", (e) => resolve({ status: "DOWN", detail: `Error: ${e.code}` }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ status: "DOWN", detail: "Timed Out" });
      });
    } catch (_) {
      resolve({ status: "DOWN", detail: "Invalid URL" });
    }
  });
}

/** ตรวจสอบ TCP Port */
function runTcpPortCheck(target) {
  return new Promise((resolve) => {
    const destination = target.target || target.host || target.ip;
    const port = target.port;

    if (!destination || !port) {
      return resolve({ status: "DOWN", detail: "Missing host or port" });
    }

    const socket = new net.Socket();
    const startTime = process.hrtime();
    socket.setTimeout(5000);

    socket.on("connect", () => {
      const diff = process.hrtime(startTime);
      const ms = (diff[0] * 1000 + diff[1] / 1e6).toFixed(0);
      socket.destroy();
      resolve({ status: "UP", detail: `Open (${ms} ms)` });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ status: "DOWN", detail: "Timeout" });
    });

    socket.on("error", (e) => {
      socket.destroy();
      resolve({ status: "DOWN", detail: `Closed (${e.code})` });
    });

    socket.connect(port, destination);
  });
}

module.exports = { runPingCheck, runWebAccessCheck, runTcpPortCheck };
