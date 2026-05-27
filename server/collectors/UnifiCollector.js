const axios = require("axios");
const https = require("https");
const BaseCollector = require("../utils/BaseCollector");
const config = require("../config");

class UnifiService {
  constructor() {
    this.api = axios.create({
      baseURL: `https://${config.UNIFI.IP}:${config.UNIFI.PORT}/api`,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 10000,
    });
  }

  async login() {
    const res = await this.api.post("/login", {
      username: config.UNIFI.USERNAME,
      password: config.UNIFI.PASSWORD,
    });
    return res.headers["set-cookie"].join("; ");
  }

  async getDevices(cookie) {
    const res = await this.api.get("/s/default/stat/device", {
      headers: { Cookie: cookie },
    });
    return res.data.data;
  }
}

async function collectUnifiHealth() {
  const collector = new BaseCollector("Unifi Network", "Network Health");
  const service = new UnifiService();

  try {
    const cookie  = await service.login();
    const devices = await service.getDevices(cookie);

    collector.addDetail("🌐 API Login", "Connected", "UP");

    const disconnected = devices.filter((d) => d.state !== 1 && d.state !== 2);
    collector.addDetail(
      "Devices Status",
      disconnected.length > 0 ? `${disconnected.length} disconnected` : "All Online",
      disconnected.length > 0 ? "UP_W" : "UP"
    );

    collector.addHeader("📶 Access Point Details");

    devices
      .filter((d) => d.type === "uap")
      .forEach((ap) => {
        const util = Math.max(
          ap.radio_table_stats?.na?.cu || 0,
          ap.radio_table_stats?.ng?.cu || 0
        );
        collector.addDetail(
          `AP: ${ap.name || ap.mac}`,
          `Clients: ${ap.num_sta} | Util: ${util}%`,
          util > 60 ? "UP_W" : "UP"
        );
      });

    return collector.report;
  } catch (error) {
    return collector.handleError(error);
  }
}

module.exports = { collectUnifiHealth };
