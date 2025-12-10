const { runNetworkChecks } = require("./collectors/NetworkCollector");
const { collectGBB100Status } = require("./collectors/GBB100Collector");
const { collectUnifiHealth } = require("./collectors/UnifiCollector");
const fs = require("fs");

let overallResults = [];
let overallAlerts = [];
const rawCheckTime = new Date();
const displayTime = rawCheckTime.toLocaleTimeString("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * ฟังก์ชันแสดงผลและรวบรวม Alert จาก Collector แต่ละตัว
 */
function logReport(report) {
  const icon =
    report.status === "UP" ? "✅" : report.status === "UP_W" ? "⚠️" : "❌";
  console.log(
    `\n=============================================================================`
  );
  console.log(
    `--- ${icon} ${report.name.padEnd(50)} [Status: ${report.status}] ---`
  );
  console.log(
    `=============================================================================`
  );
  report.details.forEach((detail) => {
    // จัดการ Icon สำหรับการแสดงผลใน Log
    let detailIcon;
    if (detail.status === "UP") {
      detailIcon = "  ";
    } else if (detail.status === "UP_W") {
      detailIcon = "⚠️";
    } else if (detail.status === "DOWN") {
      detailIcon = "❌";
    } else if (detail.status === "HEADER") {
      detailIcon = "🔽"; // ใช้🔽 สำหรับ Header เพื่อให้ดูเป็นระเบียบ ไม่ใช่เครื่องหมายเตือน
    } else {
      detailIcon = "ℹ️"; // INFO
    }

    // Header ไม่ต้องมี Padding ให้ยาวเหมือนรายการอื่นๆ
    const checkText = detail.status === 'HEADER' || detail.status === 'INFO' 
        ? detail.check 
        : detail.check.padEnd(45);
        
    console.log(`${detailIcon} ${checkText} : ${detail.result}`);
    
    // กรองรายการที่เป็น Alert (DOWN หรือ UP_W) และไม่เป็น Header/Info
    const isAlert = detail.status === 'DOWN' || detail.status === 'UP_W';
    const isNotHeaderOrInfo = detail.status !== 'HEADER' && detail.status !== 'INFO';

    if (isAlert && isNotHeaderOrInfo) {
      overallAlerts.push({
        status: detail.status,
        name: report.name,
        category: report.category,
        check: detail.check,
        result: detail.result,
      });
    }
  });
  overallResults.push(report);
}

async function runDashboard() {
  console.log(
    `\n================== 📊 IT HEALTH DASHBOARD (${displayTime}) ==================`
  ); // --- รัน Collectors ทุกตัวแบบขนาน (Concurrent) ---
  const collectorPromises = [
    collectUnifiHealth(),
    runNetworkChecks(),
    collectGBB100Status(),
  ];
  const results = await Promise.allSettled(collectorPromises);

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      logReport(result.value);
    } else {
      logReport({
        name: "Collector Execution Failure",
        category: "System Error",
        status: "DOWN",
        details: [
          {
            check: "❌ Promise Rejected",
            result: result.reason.message || "Unknown error occurred",
            status: "DOWN",
          },
        ],
      });
    }
  }); // --- สรุปผลลัพธ์รวม ---

  console.log(
    `\n============================== 🚨 SUMMARY 🚨 ===============================`
  );
  if (overallAlerts.length > 0) {
    console.log(`พบ ${overallAlerts.length} ปัญหา/คำเตือนที่ต้องตรวจสอบ:`);
    overallAlerts.forEach((alert) => {
      const prefix = alert.status === "UP_W" ? "⚠️ WARNING" : "❌ CRITICAL";
      console.log(
        `- ${prefix} [${alert.category}] ${alert.name} -> ${alert.check}: ${alert.result}`
      );
    });
  } else {
    console.log("✅ ทุกระบบที่ตรวจสอบหลักทำงานปกติ");
  }
  console.log(
    `============================================================================`
  ); // --- บันทึกผลลัพธ์รวมในไฟล์ JSON ---

  const timestamp = rawCheckTime.toISOString().replace(/[:.]/g, "-");
  const outputFileName = `Health_Check_Dashboard_Report_${timestamp}.json`;
  const finalReport = {
    checkTime: rawCheckTime.toISOString(),
    alerts: overallAlerts,
    systems: overallResults,
  };
  fs.writeFileSync(
    outputFileName,
    JSON.stringify(finalReport, null, 2),
    "utf8"
  );
  console.log(`\nบันทึกผลลัพธ์รวมในรูปแบบ JSON เสร็จสิ้น: ${outputFileName}`);
}

runDashboard();