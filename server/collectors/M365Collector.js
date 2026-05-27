const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { ConfidentialClientApplication } = require("@azure/msal-node");
const axios = require("axios");

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.M365_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.M365_TENANT_ID}`,
    clientSecret: process.env.M365_CLIENT_SECRET,
  },
});

async function getAccessToken() {
  const res = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  return res.accessToken;
}

async function collectM365Status() {
  try {
    const token   = await getAccessToken();
    const headers = { Authorization: `Bearer ${token}` };

    const [healthRes, messagesRes, licenseRes] = await Promise.all([
      axios.get("https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/healthOverviews", { headers }),
      axios.get("https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/messages",        { headers }),
      axios.get("https://graph.microsoft.com/v1.0/subscribedSkus",                            { headers }),
    ]);

    const activeLicenses = licenseRes.data.value.filter(
      (l) => l.prepaidUnits.enabled > 0 && l.prepaidUnits.enabled < 1_000_000
    );
    const mainLicense = activeLicenses.sort((a, b) => b.consumedUnits - a.consumedUnits)[0] || {};
    const usedLyc   = mainLicense.consumedUnits || 0;
    const totalLyc  = mainLicense.prepaidUnits?.enabled || 1;
    const usagePct  = Math.round((usedLyc / totalLyc) * 100);

    const targetServices = [
      { key: "Exchange Online",     label: "Exchange"  },
      { key: "Microsoft Teams",     label: "Teams"     },
      { key: "SharePoint Online",   label: "SharePoint"},
      { key: "OneDrive for Business", label: "OneDrive"},
    ];

    const details = targetServices.map((srv) => {
      const health = healthRes.data.value.find((h) => h.service === srv.key) || { status: "serviceHealthy" };
      const incidents = messagesRes.data.value.filter(
        (m) => m.services.includes(srv.key) && !m.isResolved && m.classification === "incident"
      ).length;

      const isOk = incidents === 0;
      let result = isOk ? "Healthy" : `${incidents} Incident(s)`;
      let license = null;

      if (srv.label === "Exchange") {
        result += ` | ${usedLyc}/${totalLyc}`;
        license = { percent: usagePct };
      }

      return { check: srv.label, result, status: isOk ? "UP" : "UP_W", license };
    });

    return {
      name: "Microsoft 365",
      category: "Cloud Services",
      status: details.some((d) => d.status === "UP_W") ? "UP_W" : "UP",
      details,
    };
  } catch (error) {
    console.error("❌ M365 Error:", error.message);
    return {
      name: "Microsoft 365",
      category: "Cloud Services",
      status: "DOWN",
      details: [{ check: "API Access", result: error.message, status: "DOWN" }],
    };
  }
}

module.exports = { collectM365Status };
