const axios = require("axios");
const https = require("https");
const BaseCollector = require("../utils/BaseCollector");

// สร้าง Agent พิเศษเพื่อเชื่อมต่อกับ Firewall ผ่าน HTTPS โดยไม่สนเรื่อง SSL Certificate (Self-signed)
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * ฟังก์ชันหลักในการดึงสถานะ FortiGate
 */
async function collectFortigateStatus() {
  // 1. เริ่มต้นสร้างรายงาน โดยระบุชื่ออุปกรณ์และหมวดหมู่ (Security)
  const collector = new BaseCollector(
    `FortiGate (${process.env.FORTIGATE_IP})`,
    "Security",
  );

  // 2. กำหนด URL และแนบ API Key ไปกับ Parameter
  const baseUrl = `https://${process.env.FORTIGATE_IP}/api/v2/monitor`;
  const params = { access_token: process.env.FORTIGATE_API_KEY };

  try {
    // 3. ยิงคำขอไปที่ FortiGate API (กำหนด Timeout ไว้ที่ 5 วินาที เผื่อ Firewall ไม่ตอบสนอง)
    const { data } = await axios.get(`${baseUrl}/system/resource/usage`, {
      params,
      httpsAgent: agent,
      timeout: 5000,
    });

    // 4. สกัดข้อมูลจาก JSON Response ที่ได้จาก FortiGate
    const results = data.results;
    
    // ดึงค่าปัจจุบัน (current) ถ้าไม่มีข้อมูลให้ใส่เป็น 0 กันโค้ดพัง (Optional Chaining)
    const cpu = results.cpu?.[0]?.current ?? 0;
    const mem = results.mem?.[0]?.current ?? 0;
    const sessions = results.session?.[0]?.current ?? 0;

    // 5. นำค่าที่ได้มาใส่ในรายงาน (Add Details) พร้อมใส่ Logic ตัดสินสถานะ
    
    // ตรวจสอบ CPU: เกิน 80% ให้เตือน
    collector.addDetail("CPU Usage", `${cpu}%`, cpu < 80 ? "UP" : "UP_W", {
      percent: cpu,
    });

    // ตรวจสอบ RAM: เกิน 85% ให้เตือน
    collector.addDetail("Memory Usage", `${mem}%`, mem < 85 ? "UP" : "UP_W", {
      percent: mem,
    });

    // แสดงจำนวน Session ที่ใช้งานอยู่ (จัดรูปแบบตัวเลขให้สวยงาม)
    collector.addDetail("Active Sessions", sessions.toLocaleString(), "UP");

    // 6. ส่งรายงานที่รวบรวมเสร็จแล้วกลับไป
    return collector.report;

  } catch (error) {
    // กรณีเกิดปัญหา เช่น Network ขาด, IP ผิด หรือ API Key ผิด
    // ฟังก์ชัน handleError จะเก็บ Log และส่งสถานะ Error กลับไปแทน
    return collector.handleError(error);
  }
}

module.exports = { collectFortigateStatus };