const { runNetworkChecks } = require("./collectors/NetworkCollector");
const { collectGBB100Status } = require("./collectors/GBB100Collector");
const { collectUnifiHealth } = require("./collectors/UnifiCollector");
const fs = require("fs");
const puppeteer = require("puppeteer"); 
const { 
    logReportAndCollectAlerts, 
    getOverallAlerts, 
    getOverallResults 
} = require("./utils/reportUtils"); 

const rawCheckTime = new Date();
const timestamp = rawCheckTime.toISOString().replace(/[:.]/g, "-");

/**
 * สร้าง HTML Report ธีมสีขาว (Clean White Theme)
 */
function generateHtmlReport() {
    const overallAlerts = getOverallAlerts();
    const overallResults = getOverallResults();
    
    const displayTime = rawCheckTime.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const htmlStyles = `
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, sans-serif; 
                margin: 0; 
                padding: 40px; 
                background-color: #fcfcfc; 
                color: #2c3e50; 
            }
            .container { 
                max-width: 900px; 
                margin: 0 auto; 
                background: #ffffff;
                padding: 40px; 
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                border: 1px solid #eee;
            }
            h1 { 
                color: #1a1a1a; 
                text-align: left; 
                font-size: 28px;
                margin-bottom: 5px;
                border-left: 6px solid #007bff;
                padding-left: 15px;
            }
            .timestamp { color: #888; margin-bottom: 30px; font-size: 14px; }
            
            h2 { 
                font-size: 20px; 
                margin-top: 40px; 
                margin-bottom: 15px;
                color: #444;
                border-bottom: 1px solid #eee;
                padding-bottom: 8px;
            }

            .summary-box { 
                padding: 20px; 
                border-radius: 8px; 
                background-color: #fdfdfd; 
                border: 1px solid #f0f0f0;
            }
            .alert-item { color: #d9534f; padding: 10px 0; border-bottom: 1px solid #fff5f5; }
            .warning-item { color: #f0ad4e; padding: 10px 0; border-bottom: 1px solid #fffdf5; }
            .summary-ok { color: #5cb85c; font-weight: bold; }

            .system-card { 
                margin-top: 20px; 
                border: 1px solid #f0f0f0; 
                border-radius: 8px; 
                overflow: hidden;
            }
            .card-header { 
                padding: 12px 20px; 
                font-weight: 600; 
                background: #fafafa;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
            }
            .detail-row { 
                padding: 12px 20px; 
                display: flex; 
                justify-content: space-between; 
                border-bottom: 1px solid #f9f9f9;
                font-size: 14px;
            }
            .detail-row:last-child { border-bottom: none; }
            
            .status-tag { 
                padding: 2px 8px; 
                border-radius: 4px; 
                font-size: 12px; 
                text-transform: uppercase;
            }
            .tag-UP { background: #e6ffed; color: #22863a; }
            .tag-UP_W { background: #fffbdd; color: #735c0f; }
            .tag-DOWN { background: #ffeef0; color: #b31d28; }
            .tag-HEADER { color: #007bff; font-weight: bold; background: #eef6ff; }
        </style>
    `;

    let htmlBody = `
        <div class="container">
            <h1>IT System Health Report</h1>
            <div class="timestamp">Checked on: ${displayTime} | ${rawCheckTime.toDateString()}</div>

            <h2>Summary of Issues</h2>
            <div class="summary-box">
    `;

    if (overallAlerts.length > 0) {
        overallAlerts.forEach(alert => {
            const className = alert.status === "UP_W" ? "warning-item" : "alert-item";
            htmlBody += `<div class="${className}">• [${alert.category}] ${alert.name} - ${alert.result}</div>`;
        });
    } else {
        htmlBody += `<div class="summary-ok">✔ All systems operational. No issues detected.</div>`;
    }

    htmlBody += `</div>`;

    overallResults.forEach(report => {
        htmlBody += `
            <div class="system-card">
                <div class="card-header">
                    <span>${report.name}</span>
                    <span class="status-tag tag-${report.status}">${report.status}</span>
                </div>
                <div class="card-body">
        `;

        report.details.forEach(detail => {
            const statusClass = `tag-${detail.status}`;
            htmlBody += `
                <div class="detail-row">
                    <span>${detail.check}</span>
                    <span class="${statusClass}">${detail.result}</span>
                </div>
            `;
        });

        htmlBody += `</div></div>`;
    });

    htmlBody += `</div>`;

    return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${htmlStyles}</head><body>${htmlBody}</body></html>`;
}

/**
 * บันทึกเป็น PNG ด้วย Puppeteer
 */
async function saveReportAsPng(htmlContent, outputFileName) {
    let browser;
    try {
        console.log("... Generating Clean White Report (PNG)");
        browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const bodyHandle = await page.$('body');
        const boundingBox = await bodyHandle.boundingBox();

        await page.setViewport({
            width: 980,
            height: Math.ceil(boundingBox.height),
            deviceScaleFactor: 2, 
        });

        await page.screenshot({ path: outputFileName, fullPage: true });
        await browser.close();
        return true;
    } catch (error) {
        console.error("❌ PNG Error:", error.message);
        if (browser) await browser.close();
        return false;
    }
}

async function runDashboard() {
    console.log(`\n🚀 Starting IT Health Check...`);

    const collectorPromises = [
        collectGBB100Status(),
        runNetworkChecks(),
        collectUnifiHealth(),
    ];
    
    const results = await Promise.allSettled(collectorPromises);

    results.forEach((result) => {
        if (result.status === "fulfilled") {
            logReportAndCollectAlerts(result.value);
        }
    });

    // แสดงสรุปใน Console (คงไว้เพื่อดูสถานะเบื้องต้น)
    const overallAlerts = getOverallAlerts();
    console.log(`\n--- Execution Finished ---`);
    console.log(`Found ${overallAlerts.length} issues.`);

    // สร้างรูปภาพ PNG
    const outputPngFileName = `IT_Health_Report_${timestamp}.png`;
    const htmlContent = generateHtmlReport();
    const isPngSaved = await saveReportAsPng(htmlContent, outputPngFileName);

    if (isPngSaved) {
        console.log(`✅ Report saved as: ${outputPngFileName}`);
    }
}

runDashboard();