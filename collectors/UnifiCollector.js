const axios = require("axios");
const https = require("https");
const BaseCollector = require("../utils/BaseCollector");
const config = require("../config");

/**
 * Service สำหรับจัดการการสื่อสารกับ Unifi Controller API
 */
class UnifiService {
  constructor() {
    this.api = axios.create({
      baseURL: `https://${config.UNIFI.IP}:${config.UNIFI.PORT}/api`,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }), // ข้ามการเช็ค SSL สำหรับ Controller ภายใน
      timeout: 10000,
    });
  }

  // ล็อกอินเพื่อขอ Session Cookie
  async login() {
    const res = await this.api.post("/login", {
      username: config.UNIFI.USERNAME,
      password: config.UNIFI.PASSWORD,
    });
    // รวม Cookie ทุกตัวที่ได้รับกลับมาเป็น String เดียว
    return res.headers["set-cookie"].join("; ");
  }

  // ดึงรายการอุปกรณ์ทั้งหมดใน Site "default"
  async getDevices(cookie) {
    const res = await this.api.get("/s/default/stat/device", {
      headers: { Cookie: cookie },
    });
    return res.data.data;
  }
}

/**
 * ฟังก์ชันหลักในการรวบรวมสถานะ Unifi Network
 */
async function collectUnifiHealth() {
  const collector = new BaseCollector("Unifi Network", "Network Health");
  const service = new UnifiService();

  try {
    // 1. ยืนยันตัวตน
    const cookie = await service.login();
    const devices = await service.getDevices(cookie);

    collector.addDetail("🌐 API Login", "Connected", "UP");

    // 2. ตรวจสอบอุปกรณ์ที่หลุดการเชื่อมต่อ (State ไม่ใช่ 1 หรือ 2)
    const disconnected = devices.filter((d) => d.state !== 1 && d.state !== 2);
    
    collector.addDetail(
      "Devices Status",
      disconnected.length > 0
        ? `${disconnected.length} disconnected`
        : "All Online",
      disconnected.length > 0 ? "UP_W" : "UP",
    );

    // 3. แจกแจงสถานะของ Access Point รายตัว
    collector.addHeader("📶 Access Point Details");
    
    devices
      .filter((d) => d.type === "uap") // เลือกเฉพาะอุปกรณ์ประเภท Access Point
      .forEach((ap) => {
        // ดึงค่าการใช้งานคลื่น (Utilization) ที่สูงที่สุดระหว่าง 2.4GHz (ng) และ 5GHz (na)
        const util = Math.max(
          ap.radio_table_stats?.na?.cu || 0,
          ap.radio_table_stats?.ng?.cu || 0,
        );

        // แสดงผล: ชื่อ AP, จำนวน Client, และเปอร์เซ็นต์การใช้งาน
        collector.addDetail(
          `AP: ${ap.name || ap.mac}`,
          `Clients: ${ap.num_sta} | Util: ${util}%`,
          util > 60 ? "UP_W" : "UP", // เกณฑ์เตือนคือใช้งานเกิน 60%
        );
      });

    return collector.report;

  } catch (error) {
    // จัดการกรณี Login พลาด หรือ Controller ล่ม
    return collector.handleError(error);
  }
}

module.exports = { collectUnifiHealth };