/**
 * utils/reportUtils.js
 * จัดการสถานะ, การรวบรวม Alert และสถิติรวม
 */

let reportState = { alerts: [], results: [], startTime: null };

/**
 * ตรวจสอบค่าเทียบกับเกณฑ์ และคืนสถานะ/ข้อความ
 */
function getStatus(value, low, high, unit = "") {
  if (value === undefined || value === null || value === "" || isNaN(value)) {
    return { status: "UNKNOWN", statusText: "ไม่พบข้อมูล/เซนเซอร์ขัดข้อง" };
  }

  if (low !== null && value < low) {
    const statusText = `ต่ำเกินไป (${value} < ${low} ${unit})`.trim();
    return { status: unit === "นาที" ? "DOWN" : "UP_W", statusText };
  }

  if (high !== null && value > high) {
    return { status: "UP_W", statusText: `สูงเกินไป (${value} > ${high} ${unit})`.trim() };
  }

  return { status: "UP", statusText: "ปกติ (OK)" };
}

/**
 * บันทึกรายงานและรวบรวม Alert
 */
function logReportAndCollectAlerts(report) {
  const STATUS_ICONS = { UP: "✅", UP_W: "⚠️", DOWN: "❌", HEADER: "🔹", INFO: "ℹ️", UNKNOWN: "❓" };
  const now = new Date().toISOString();

  report.details.forEach((detail) => {
    const isProblematic = ["DOWN", "UP_W", "UNKNOWN"].includes(detail.status);
    const isStructural = ["HEADER", "INFO"].includes(detail.status);

    if (isProblematic && !isStructural) {
      reportState.alerts.push({
        status: detail.status,
        icon: STATUS_ICONS[detail.status],
        name: report.name,
        category: report.category || "General",
        check: detail.check,
        result: detail.result,
        timestamp: now,
      });
    }
  });

  reportState.results.push({ ...report, processedAt: now });
}

/**
 * ดึงข้อมูลสรุปสำหรับส่งให้ Dashboard
 */
function getOverallStats() {
  return {
    totalChecks: reportState.results.reduce((acc, r) => acc + r.details.length, 0),
    upCount: reportState.results.filter((r) => r.status === "UP").length,
    warningCount: reportState.results.filter((r) => r.status === "UP_W").length,
    downCount: reportState.results.filter((r) => r.status === "DOWN").length,
    alerts: reportState.alerts,
    results: reportState.results,
  };
}

/**
 * ล้างข้อมูลเพื่อเริ่มรอบใหม่
 */
function clearState() {
  reportState = { alerts: [], results: [], startTime: new Date().toISOString() };
}

module.exports = {
  getStatus,
  logReportAndCollectAlerts,
  getOverallAlerts: () => reportState.alerts,
  getOverallResults: () => reportState.results,
  getOverallStats,
  clearState,
};
