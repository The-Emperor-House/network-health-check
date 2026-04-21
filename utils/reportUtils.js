/**
 * utils/reportUtils.js
 * จัดการเรื่องการตรวจสอบเกณฑ์, การรวบรวมสถานะ และการจัดการ Alert ทั้งหมด
 */

// ใช้ Object เก็บสถานะการรันในรอบปัจจุบัน
let reportState = {
    alerts: [],
    results: [],
    startTime: null
};

/**
 * ตรวจสอบค่าเทียบกับเกณฑ์และให้สถานะ/ข้อความภาษาไทย
 * @param {number} value - ค่าที่วัดได้
 * @param {number|null} low - เกณฑ์ต่ำสุด
 * @param {number|null} high - เกณฑ์สูงสุด
 * @param {string} unit - หน่วยนับ
 */
function getStatus(value, low, high, unit = "") {
    // ตรวจสอบค่าว่างหรือ NaN [cite: 2026-02-23]
    if (value === undefined || value === null || value === "" || isNaN(value)) {
        return { status: "UNKNOWN", statusText: "ไม่พบข้อมูล/เซนเซอร์ขัดข้อง" };
    }

    let statusText = "ปกติ (OK)";
    let status = "UP";

    // ตรวจสอบเกณฑ์ต่ำเกินไป
    if (low !== null && value < low) {
        statusText = `ต่ำเกินไป (${value} < ${low} ${unit})`.trim();
        // เงื่อนไขพิเศษ: ถ้าเป็นหน่วยนาที (AC Fail) ต่ำกว่าเกณฑ์ถือว่าวิกฤต (DOWN) [cite: 2026-02-23]
        status = (unit === "นาที") ? "DOWN" : "UP_W";
    } 
    // ตรวจสอบเกณฑ์สูงเกินไป
    else if (high !== null && value > high) {
        statusText = `สูงเกินไป (${value} > ${high} ${unit})`.trim();
        status = "UP_W";
    }

    return { status, statusText };
}

/**
 * บันทึกรายงานและรวบรวมรายการที่มีปัญหา (Alerts)
 * @param {object} report - รายงานจาก Collector
 */
function logReportAndCollectAlerts(report) {
    const STATUS_ICONS = {
        UP: "✅",
        UP_W: "⚠️",
        DOWN: "❌",
        HEADER: "🔹",
        INFO: "ℹ️",
        UNKNOWN: "❓"
    };

    // ใส่ Timestamp ให้แต่ละรายละเอียดถ้ายังไม่มี
    const now = new Date().toISOString();

    report.details.forEach((detail) => { 
        // ตรวจสอบว่าเป็นรายการที่ต้องแจ้งเตือนหรือไม่ (DOWN, UP_W, UNKNOWN) [cite: 2026-02-23]
        const isProblematic = ["DOWN", "UP_W", "UNKNOWN"].includes(detail.status);
        const isNotStructural = !["HEADER", "INFO"].includes(detail.status);

        if (isProblematic && isNotStructural) {
            reportState.alerts.push({
                status: detail.status,
                icon: STATUS_ICONS[detail.status],
                name: report.name,
                category: report.category || "General",
                check: detail.check,
                result: detail.result,
                timestamp: now
            });
        }
    });

    reportState.results.push({
        ...report,
        processedAt: now
    });
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลสรุปเพื่อส่งให้ Dashboard
 */
function getOverallStats() {
    return {
        totalChecks: reportState.results.reduce((acc, r) => acc + r.details.length, 0),
        upCount: reportState.results.filter(r => r.status === "UP").length,
        warningCount: reportState.results.filter(r => r.status === "UP_W").length,
        downCount: reportState.results.filter(r => r.status === "DOWN").length,
        alerts: reportState.alerts,
        results: reportState.results
    };
}

/**
 * ล้างข้อมูลเพื่อเริ่มรอบการทำงานใหม่
 */
function clearState() {
    reportState = {
        alerts: [],
        results: [],
        startTime: new Date().toISOString()
    };
}

module.exports = {
    getStatus,
    logReportAndCollectAlerts,
    getOverallAlerts: () => reportState.alerts,
    getOverallResults: () => reportState.results,
    getOverallStats,
    clearState
};