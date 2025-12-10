// config.js

require("dotenv").config();

module.exports = {
  // FortiGate API Access
  FORTIGATE: {
    // ดึงค่าสำคัญจาก Environment Variables
    IP: process.env.FORTIGATE_IP,
    API_KEY: process.env.FORTIGATE_API_KEY,
    // กำหนดค่าคงที่ในไฟล์ Config
    PORT: process.env.FORTIGATE_PORT || 11443,
    VDOM: 'root',                     // กำหนด VDOM เป็น 'root' (ปรับตามการตั้งค่าของคุณ)
    CPU_THRESHOLD: 80,               // เกณฑ์ CPU Warning (80%)
    MEMORY_THRESHOLD: 80,            // เกณฑ์ Memory Warning (80%)
    SESSION_THRESHOLD: 90            // เกณฑ์ Session Warning (90%)
  },

  // GBB100 (Environment Monitor)
  GBB100: {
    URL: process.env.GBB100_URL,
    TEMP_THRESHOLD: 28,
  },

  // Microsoft 365 (Graph API Access)
  M365: {
    CLIENT_ID: process.env.M365_CLIENT_ID,
    TENANT_ID: process.env.M365_TENANT_ID,
    CLIENT_SECRET: process.env.M365_CLIENT_SECRET,
    HEALTH_CHECK_URL:
      "https://graph.microsoft.com/v1.0/admin/serviceAnnouncements/health",
  },

  // Unifi Controller
  UNIFI: {
    IP: process.env.UNIFI_IP,
    PORT: 8443,
    USERNAME: process.env.UNIFI_USERNAME,
    PASSWORD: process.env.UNIFI_PASSWORD,
    CLIENT_THRESHOLD: 150,
  },

  // Basic Network Checks
  NETWORK_CHECKS: [
    // --- 1. ระบบเครือข่ายหลัก (Network System) ---
    {
      category: "Network System",
      type: "Ping",
      name: "Ping Core Router (AIS)",
      target: "172.168.10.1",
    },
    {
      category: "Network System",
      type: "Ping",
      name: "Ping Firewall",
      target: "192.168.9.1",
    },
    {
      category: "Network System",
      type: "Ping",
      name: "Ping True Router Gateway",
      target: "172.168.20.1",
    }, // << เพิ่ม True Router
    {
      category: "Network System",
      type: "Ping",
      name: "Ping 8.8.8.8 (Internet Check)",
      target: "8.8.8.8",
    }, // << เพิ่ม Internet Check

    // --- 2. เว็บไซต์ภายนอก (Web Access Check) ---
    {
      category: "Web Services",
      type: "Web",
      name: "Access Emperor House",
      url: "https://www.emperorhouse.com",
    },
    {
      category: "Web Services",
      type: "Web",
      name: "Access ACARA BY EMPEROR",
      url: "https://www.acara.in.th",
    },
    {
      category: "Web Services",
      type: "Web",
      name: "Access LeoAngelo",
      url: "https://leoangelo.co.th",
    },
    {
      category: "Web Services",
      type: "Web",
      name: "Access TAURUS Renovation",
      url: "https://taurusrenovation.com",
    },

    // --- 3. เซิร์ฟเวอร์และบริการสำรอง (Server & Backup) ---
    {
      category: "Server System",
      type: "Ping",
      name: "Ping Domain Controller",
      target: "192.168.9.241",
    },
    {
      category: "Server System",
      type: "TCP",
      name: "Local DNS Service (53)",
      target: "192.168.9.241",
      port: 53,
    },
    {
      category: "Server System",
      type: "TCP",
      name: "Backup Data RDP (3389)",
      target: "192.168.9.249",
      port: 3389,
    },

    // --- 4. อุปกรณ์ปลายทาง/เครื่องพิมพ์ (Printer & End-point Devices) ---
    {
      category: "Printer Device",
      type: "Ping",
      name: "Printer C3922 Floor1",
      target: "192.168.9.211",
    },
    {
      category: "Printer Device",
      type: "Ping",
      name: "Printer C3320 Floor2",
      target: "192.168.9.212",
    },
    {
      category: "Printer Device",
      type: "Ping",
      name: "Printer 2006N Floor3 (CO)",
      target: "192.168.9.213",
    },
    {
      category: "Printer Device",
      type: "Ping",
      name: "Printer L15150 Floor3 (HR)",
      target: "192.168.9.220",
    },
    {
      category: "Printer Device",
      type: "Ping",
      name: "Printer 2006N Floor4 (AC)",
      target: "192.168.9.214",
    },
    {
      category: "Printer Device",
      type: "Ping",
      name: "Printer HL-1210W (MD Room)",
      target: "192.168.9.217",
    },
    {
      category: "Printer Device",
      type: "Ping",
      name: "Printer BP5100DW Floor4 (AC)",
      target: "192.168.9.218",
    },
  ],
};
