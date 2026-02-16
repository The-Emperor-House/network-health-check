require("dotenv").config();
const { ConfidentialClientApplication } = require("@azure/msal-node");
const axios = require("axios");

const msalConfig = {
    auth: {
        clientId: process.env.M365_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.M365_TENANT_ID}`,
        clientSecret: process.env.M365_CLIENT_SECRET,
    }
};

const cca = new ConfidentialClientApplication(msalConfig);

async function getAccessToken() {
    const tokenRequest = { scopes: ["https://graph.microsoft.com/.default"] };
    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    return response.accessToken;
}

async function collectM365Status() {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Bearer ${token}` };

        // ดึง Health, Messages (Incidents), และ License พร้อมกัน
        const [healthRes, messagesRes, licenseRes] = await Promise.all([
            axios.get("https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/healthOverviews", { headers }),
            axios.get("https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/messages", { headers }),
            axios.get("https://graph.microsoft.com/v1.0/subscribedSkus", { headers })
        ]);

        // --- คำนวณ License (เลือกตัวหลักที่ใช้ในบริษัท) ---
        const activeLicenses = licenseRes.data.value.filter(l => l.prepaidUnits.enabled > 0 && l.prepaidUnits.enabled < 1000000);
        const mainLicense = activeLicenses.sort((a, b) => b.consumedUnits - a.consumedUnits)[0] || {};
        
        const usedLyc = mainLicense.consumedUnits || 0;
        const totalLyc = mainLicense.prepaidUnits?.enabled || 1;
        const usagePercent = Math.round((usedLyc / totalLyc) * 100);

        const details = [];
        const targetServices = [
            { key: "Exchange Online", label: "Exchange" },
            { key: "Microsoft Teams", label: "Teams" },
            { key: "SharePoint Online", label: "SharePoint" },
            { key: "OneDrive for Business", label: "OneDrive" }
        ];

        targetServices.forEach(srv => {
            const item = healthRes.data.value.find(h => h.service === srv.key) || { status: "serviceHealthy" };
            
            // กรองเฉพาะ Incident ที่ยังไม่แก้
            const activeIncidents = messagesRes.data.value.filter(m => 
                m.services.includes(srv.key) && !m.isResolved && m.classification === "incident"
            ).length;

            const isOperational = activeIncidents === 0;
            let resultText = isOperational ? "Healthy" : `${activeIncidents} Incident(s)`;
            let licenseData = null;

            // แทรกตัวเลข 47/52 เข้าไปในบรรทัด Exchange
            if (srv.label === "Exchange") {
                resultText += ` | ${usedLyc}/${totalLyc}`;
                licenseData = { percent: usagePercent };
            }

            details.push({
                check: srv.label,
                result: resultText,
                status: isOperational ? "UP" : "UP_W",
                license: licenseData
            });
        });

        return {
            name: "Microsoft 365 Summary",
            status: details.some(d => d.status === "UP_W") ? "UP_W" : "UP",
            details: details
        };

    } catch (error) {
        console.error("❌ M365 API Error:", error.message);
        return { name: "M365 Summary", status: "DOWN", details: [] };
    }
}

module.exports = { collectM365Status };