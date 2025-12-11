const { runNetworkChecks } = require("./collectors/NetworkCollector");
const { collectGBB100Status } = require("./collectors/GBB100Collector");
const { collectUnifiHealth } = require("./collectors/UnifiCollector");
const fs = require("fs");
const puppeteer = require("puppeteer"); 
// ดึงฟังก์ชันจัดการรายงานจาก utils
const { 
    logReportAndCollectAlerts, 
    getOverallAlerts, 
    getOverallResults 
} = require("./utils/reportUtils"); 

// ตัวแปรเวลาและ timestamp (ถูกเก็บไว้ที่นี่เพื่อความสะดวกในการอ้างอิง)
const rawCheckTime = new Date();
const timestamp = rawCheckTime.toISOString().replace(/[:.]/g, "-");

// *** ฟังก์ชัน logReportAndCollectAlerts ถูกย้ายไปที่ reportUtils.js แล้ว ***

/**
 * สร้างสตริง HTML จากผลลัพธ์รวม
 * @returns {string} HTML content
 */
function generateHtmlReport() {
    // นำเข้า Alerts และ Results ที่รวบรวมไว้
    const overallAlerts = getOverallAlerts();
    const overallResults = getOverallResults();
    
    const displayTime = rawCheckTime.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    // ใช้ Template Literal ในการสร้าง HTML
    const htmlStyles = `
        <style>
            body { font-family: 'Tahoma', sans-serif; margin: 20px; color: #333; }
            .container { max-width: 900px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; }
            h1 { background-color: #007bff; color: white; padding: 15px; text-align: center; border-radius: 5px; margin-top: 0; }
            h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; margin-top: 30px; font-size: 1.5em; }
            .summary { margin-top: 15px; padding: 15px; border: 1px dashed #007bff; background-color: #e6f0ff; border-radius: 5px; }
            .alert-item, .warning-item, .summary-ok { padding: 8px; margin-bottom: 5px; border-radius: 3px; }
            .alert-item { background-color: #f8d7da; border-left: 5px solid #dc3545; color: #721c24; }
            .warning-item { background-color: #fff3cd; border-left: 5px solid #ffc107; color: #856404; }
            .summary-ok { background-color: #d4edda; border-left: 5px solid #28a745; color: #155724; font-weight: bold;}
            .system-report { border: 1px solid #ddd; margin-top: 15px; border-radius: 5px; overflow: hidden; }
            .system-header { padding: 10px; color: white; font-weight: bold; }
            .status-UP { background-color: #28a745; }
            .status-UP_W { background-color: #ffc107; color: #333; }
            .status-DOWN { background-color: #dc3545; }
            .detail-list { list-style: none; padding: 0; margin: 0; }
            .detail-list li { padding: 8px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
            .detail-list li:last-child { border-bottom: none; }
            .detail-check { flex-basis: 75%; font-size: 0.9em; }
            .detail-result { flex-basis: 25%; text-align: right; font-weight: 500; }
            .status-icon { margin-right: 5px; font-size: 1.1em; }
            .down-text { color: #dc3545; font-weight: bold; }
            .warning-text { color: #ffc107; font-weight: bold; }
        </style>
    `;

    let htmlBody = `
        <div class="container">
            <h1>📊 IT HEALTH DASHBOARD REPORT</h1>
            <p><strong>เวลาตรวจสอบ:</strong> ${displayTime} (${rawCheckTime.toISOString()})</p>

            <h2>🚨 สรุปปัญหาและคำเตือน (${overallAlerts.length} รายการ)</h2>
            <div class="summary">
    `;

    if (overallAlerts.length > 0) {
        overallAlerts.forEach(alert => {
            const isWarning = alert.status === "UP_W";
            const className = isWarning ? "warning-item" : "alert-item";
            const prefix = isWarning ? "⚠️ WARNING" : "❌ CRITICAL";
            htmlBody += `<div class="${className}"><strong>${prefix}</strong> [${alert.category}] ${alert.name} -> ${alert.check}: ${alert.result}</div>`;
        });
    } else {
        htmlBody += `<div class="summary-ok">✅ ทุกระบบที่ตรวจสอบหลักทำงานปกติ</div>`;
    }

    htmlBody += `
            </div>

            <h2>✅ รายละเอียดระบบทั้งหมด</h2>
    `;

    overallResults.forEach(report => {
        const headerClass = `system-header status-${report.status}`;
        htmlBody += `
            <div class="system-report">
                <div class="${headerClass}">
                    ${report.status === 'UP' ? '✅' : report.status === 'UP_W' ? '⚠️' : '❌'}
                    ${report.name} [Status: ${report.status}]
                </div>
                <ul class="detail-list">
        `;

        // ใช้ report.details โดยไม่ต้องจัดเรียงซ้ำ เพราะถูกจัดเรียงใน Collector หรือ logReportAndCollectAlerts แล้ว
        report.details.forEach(detail => {
            let detailIcon;
            let statusClass = '';
            if (detail.status === "UP") detailIcon = "✅";
            else if (detail.status === "UP_W") { detailIcon = "⚠️"; statusClass = 'warning-text'; }
            else if (detail.status === "DOWN") { detailIcon = "❌"; statusClass = 'down-text'; }
            else if (detail.status === "HEADER") detailIcon = "🔽";
            else detailIcon = "ℹ️";

            htmlBody += `
                <li>
                    <span class="detail-check ${statusClass}"><span class="status-icon">${detailIcon}</span>${detail.check}</span>
                    <span class="detail-result ${statusClass}">${detail.result}</span>
                </li>
            `;
        });

        htmlBody += `
                </ul>
            </div>
        `;
    });

    htmlBody += `
        </div>
    `;

    return `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>IT Health Dashboard Report</title>
            ${htmlStyles}
        </head>
        <body>
            ${htmlBody}
        </body>
        </html>
    `;
}

/**
 * บันทึกรายงานในรูปแบบ PNG โดยใช้ Puppeteer
 * @param {string} htmlContent - เนื้อหา HTML ของรายงาน
 * @param {string} outputFileName - ชื่อไฟล์ PNG ที่ต้องการบันทึก
 * @returns {Promise<boolean>} สถานะการบันทึก
 */
async function saveReportAsPng(htmlContent, outputFileName) {
    let browser;
    try {
        console.log("... กำลังสร้างไฟล์ PNG (โปรดรอสักครู่)");
        browser = await puppeteer.launch({
            // ใช้ no-sandbox ถ้ามีปัญหาในการรันบนบางสภาพแวดล้อม (Linux/Docker)
            // args: ['--no-sandbox', '--disable-setuid-sandbox'], 
            headless: true,
        });
        const page = await browser.newPage();

        // ตั้งค่าเนื้อหา HTML และรอจนกว่า network จะนิ่ง
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // คำนวณขนาดความสูงของเนื้อหา
        const bodyHandle = await page.$('body');
        const boundingBox = await bodyHandle.boundingBox();
        const height = Math.ceil(boundingBox.height) + 40; // เผื่อ margin

        await page.setViewport({
            width: 950, // กำหนดความกว้างให้พอดีกับ container ใน HTML
            height: height,
            deviceScaleFactor: 2, // เพิ่มความละเอียดของภาพ
        });

        // บันทึกเป็นไฟล์ PNG
        await page.screenshot({
            path: outputFileName,
            fullPage: false,
        });

        await browser.close();
        return true;

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการสร้างไฟล์ PNG:", error.message);
        if (browser) {
            await browser.close();
        }
        return false;
    }
}


/**
 * ฟังก์ชันหลักในการรัน Dashboard
 */
async function runDashboard() {
    const displayTime = rawCheckTime.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    console.log(
        `\n================== 📊 IT HEALTH DASHBOARD (${displayTime}) ==================`
    );

    // --- รัน Collectors ทุกตัวแบบขนาน (Concurrent) ---
    const collectorPromises = [
        collectGBB100Status(),
        runNetworkChecks(),
        collectUnifiHealth(),
    ];
    const results = await Promise.allSettled(collectorPromises);

    results.forEach((result) => {
        if (result.status === "fulfilled") {
            logReportAndCollectAlerts(result.value);
        } else {
            // จัดการกรณีที่ Collector ตัวใดตัวหนึ่งล้มเหลว
            logReportAndCollectAlerts({
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
    });

    // --- สรุปผลลัพธ์รวม ---
    const overallAlerts = getOverallAlerts(); // ดึงค่า Alerts ที่รวบรวมมาแล้ว
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
    );

    // --- บันทึกผลลัพธ์รวมในไฟล์ JSON ---
    const outputJsonFileName = `Health_Check_Dashboard_Report_${timestamp}.json`;
    const finalReport = {
        checkTime: rawCheckTime.toISOString(),
        alerts: overallAlerts,
        systems: getOverallResults(), // ดึงค่า Results ที่รวบรวมมาแล้ว
    };
    fs.writeFileSync(
        outputJsonFileName,
        JSON.stringify(finalReport, null, 2),
        "utf8"
    );
    console.log(`\nบันทึกผลลัพธ์รวมในรูปแบบ JSON เสร็จสิ้น: ${outputJsonFileName}`);

    // --- บันทึกผลลัพธ์รวมในไฟล์ PNG ---
    const outputPngFileName = `Health_Check_Dashboard_Report_${timestamp}.png`;
    const htmlContent = generateHtmlReport();

    const isPngSaved = await saveReportAsPng(htmlContent, outputPngFileName);

    if (isPngSaved) {
        console.log(`บันทึกผลลัพธ์รวมในรูปแบบ PNG เสร็จสิ้น: ${outputPngFileName}`);
    } else {
        console.log(`❌ ไม่สามารถบันทึกผลลัพธ์ในรูปแบบ PNG ได้ (ตรวจสอบการติดตั้ง Puppeteer)`);
    }
}

runDashboard();