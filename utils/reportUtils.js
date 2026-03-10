/**
 * utils/reportUtils.js
 * จัดการเรื่องการตรวจสอบเกณฑ์, การแสดงผล log และการรวบรวมสถานะทั้งหมด
 */

// ใช้ Object แทน Array อิสระเพื่อให้จัดการ state ง่ายขึ้น
const reportState = {
    alerts: [],
    results: []
};

/**
 * ตรวจสอบค่าเทียบกับเกณฑ์และให้สถานะ/ข้อความภาษาไทย
 * ปรับปรุง: รองรับเกณฑ์แบบ object เพื่อความอ่านง่าย
 */
function getStatus(value, low, high, unit = "") {
    if (value === undefined || value === null || value === "" || isNaN(value)) {
        return { status: "UNKNOWN", statusText: "ไม่พบข้อมูล/ไม่สามารถอ่านค่าได้" };
    }

    let statusText = "พอดี (OK)";
    let status = "UP";

    if (low !== null && value < low) {
        statusText = `ต่ำเกินไป (< ${low} ${unit})`.trim();
        // เงื่อนไขพิเศษ: ถ้าเป็นหน่วยนาที (AC Fail) และต่ำกว่าเกณฑ์ ให้ถือว่าวิกฤต (DOWN)
        status = (unit === "นาที") ? "DOWN" : "UP_W";
    } else if (high !== null && value > high) {
        statusText = `สูงเกินไป (> ${high} ${unit})`.trim();
        status = "UP_W";
    }

    return { status, statusText };
}

/**
 * ฟังก์ชันแสดงผลใน console และรวบรวม Alert
 * ปรับปรุง: แยก Logic การเลือก Icon และการ Format ข้อความให้เป็นระเบียบ
 */
function logReportAndCollectAlerts(report) {
    const STATUS_ICONS = {
        UP: "✅",
        UP_W: "⚠️",
        DOWN: "❌",
        HEADER: "🔽",
        INFO: "ℹ️",
        UNKNOWN: "❓"
    };

    const overallIcon = STATUS_ICONS[report.status] || STATUS_ICONS.UNKNOWN;
    
    // --- Console Output Header ---
    console.log(`\n${"=".repeat(80)}`);
    console.log(`--- ${overallIcon} ${report.name.padEnd(55)} [Status: ${report.status}] ---`);
    console.log(`${"=".repeat(80)}`);

    report.details.forEach((detail) => { 
        let detailIcon = STATUS_ICONS[detail.status] || "  ";
        if (detail.status === "UP") detailIcon = "  "; // เพื่อความสะอาดของสายตา

        // การจัด Format บรรทัด
        const isStructural = detail.status === 'HEADER' || detail.status === 'INFO';
        const checkText = isStructural ? detail.check : detail.check.padEnd(45);
        const separator = isStructural ? "" : " : ";

        console.log(`${detailIcon} ${checkText}${separator}${detail.result}`);

        // --- Collect Alerts ---
        // เก็บเฉพาะรายการที่ผิดปกติ และไม่ใช่ตัวคั่น (Header/Info)
        const isAlert = ["DOWN", "UP_W", "UNKNOWN"].includes(detail.status);
        if (isAlert && !isStructural) {
            reportState.alerts.push({
                status: detail.status,
                name: report.name,
                category: report.category || "General",
                check: detail.check,
                result: detail.result,
                timestamp: new Date().toISOString()
            });
        }
    });

    reportState.results.push(report);
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลสรุป
 */
function getOverallAlerts() {
    return reportState.alerts;
}

function getOverallResults() {
    return reportState.results;
}

/**
 * ล้างข้อมูล (ใช้กรณีเริ่มรอบการรันใหม่)
 */
function clearState() {
    reportState.alerts = [];
    reportState.results = [];
}

module.exports = {
    getStatus,
    logReportAndCollectAlerts,
    getOverallAlerts,
    getOverallResults,
    clearState
};