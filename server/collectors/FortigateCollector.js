const axios = require("axios");
const https = require("https");
const BaseCollector = require("../utils/BaseCollector");

const agent = new https.Agent({ rejectUnauthorized: false });

async function collectFortigateStatus() {
  const collector = new BaseCollector(
    `FortiGate (${process.env.FORTIGATE_IP})`,
    "Security"
  );

  const baseUrl = `https://${process.env.FORTIGATE_IP}/api/v2/monitor`;
  const params = { access_token: process.env.FORTIGATE_API_KEY };

  try {
    const { data } = await axios.get(`${baseUrl}/system/resource/usage`, {
      params,
      httpsAgent: agent,
      timeout: 5000,
    });

    const results  = data.results;
    const cpu      = results.cpu?.[0]?.current ?? 0;
    const mem      = results.mem?.[0]?.current ?? 0;
    const sessions = results.session?.[0]?.current ?? 0;

    collector.addDetail("CPU Usage",      `${cpu}%`,                   cpu < 80 ? "UP" : "UP_W", { percent: cpu });
    collector.addDetail("Memory Usage",   `${mem}%`,                   mem < 85 ? "UP" : "UP_W", { percent: mem });
    collector.addDetail("Active Sessions", sessions.toLocaleString(),  "UP");

    return collector.report;
  } catch (error) {
    return collector.handleError(error);
  }
}

module.exports = { collectFortigateStatus };
