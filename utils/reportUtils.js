// utils/reportUtils.js

let overallAlerts = [];
let overallResults = [];

/**
 * ตรวจสอบค่าเทียบกับเกณฑ์และให้สถานะ/ข้อความภาษาไทย
 */
function getStatus(value, low, high, unit) {
  if (isNaN(value) || value === null || value === "") {
    return { status: "UNKNOWN", statusText: "ไม่พบข้อมูล/ไม่สามารถอ่านค่าได้" };
  }

  let statusText = "พอดี (OK)";
  let status = "UP";
  if (low !== null && value < low) {
    statusText = `ต่ำเกินไป (< ${low} ${unit})`;
    status = "UP_W";
  } else if (high !== null && value > high) {
    statusText = `สูงเกินไป (> ${high} ${unit})`;
    status = "UP_W";
  }

  // สถานะไฟฟ้าล้มเหลว (ถือเป็น DOWN หากค่าต่ำกว่าเกณฑ์)
  if (unit === "นาที" && statusText.includes("ต่ำเกินไป")) {
    status = "DOWN";
  }
  return { status, statusText };
}

/**
 * จัดเรียงรายละเอียดผลลัพธ์ย่อย (ไม่ได้ถูกใช้ใน logReportAndCollectAlerts แล้ว)
 * (ยังคงเก็บไว้เผื่อ Collector ตัวอื่นต้องการใช้การเรียงนี้)
 */
function sortReportDetails(details) {
    return details.sort((a, b) => {
        // 1. ให้ 'HEADER' มาก่อน
        if (a.status === 'HEADER' && b.status !== 'HEADER') return -1;
        if (b.status === 'HEADER' && a.status !== 'HEADER') return 1;

        // 2. ให้ 'INFO' มาหลัง 'HEADER'
        if (a.status === 'INFO' && b.status !== 'INFO' && b.status !== 'HEADER') return 1;
        if (b.status === 'INFO' && a.status !== 'INFO' && a.status !== 'HEADER') return -1;
        
        // 3. เรียงตามชื่อรายการ (check)
        return a.check.localeCompare(b.check);
    });
}

/**
 * ฟังก์ชันแสดงผลใน console และรวบรวม Alert (ใช้ลำดับที่ Collector ส่งมา)
 */
function logReportAndCollectAlerts(report) {
    const icon =
        report.status === "UP" ? "✅" : report.status === "UP_W" ? "⚠️" : "❌";
    
    // --- Console Output Header ---
    console.log(
        `\n=============================================================================`
    );
    console.log(
        `--- ${icon} ${report.name.padEnd(50)} [Status: ${report.status}] ---`
    );
    console.log(
        `=============================================================================`
    );

    // *** ใช้ report.details โดยตรง ไม่มีการจัดเรียงซ้ำ ***
    report.details.forEach((detail) => { 
        // จัดการ Icon สำหรับการแสดงผลใน Log
        let detailIcon;
        if (detail.status === "UP") detailIcon = "  ";
        else if (detail.status === "UP_W") detailIcon = "⚠️";
        else if (detail.status === "DOWN") detailIcon = "❌";
        else if (detail.status === "HEADER") detailIcon = "🔽";
        else detailIcon = "ℹ️"; // INFO

        const checkText = detail.status === 'HEADER' || detail.status === 'INFO'
            ? detail.check
            : detail.check.padEnd(45);

        console.log(`${detailIcon} ${checkText} : ${detail.result}`);

        // --- Collect Alerts ---
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

// ฟังก์ชันสำหรับส่งค่าที่รวบรวมไปให้ไฟล์อื่น
function getOverallAlerts() {
    return overallAlerts;
}

function getOverallResults() {
    return overallResults;
}


module.exports = {
    getStatus,
    logReportAndCollectAlerts,
    getOverallAlerts,
    getOverallResults,
};