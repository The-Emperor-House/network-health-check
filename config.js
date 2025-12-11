// config.js

require("dotenv").config();

module.exports = {
  // GBB100 (Environment Monitor)
  GBB100: {
    URL: process.env.GBB100_URL,
    TEMP_THRESHOLD: 28,
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

     // --- อุปกรณ์ปลายทาง/เครื่องพิมพ์ (Printer & End-point Devices) ---
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
      name: "Printer HL-1210W (MD Room)",
      target: "192.168.9.217",
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
      name: "Printer BP5100DW Floor4 (AC)",
      target: "192.168.9.218",
    },

    // --- ระบบเครือข่ายหลัก (Network System) ---
    {
      category: "Network System",
      type: "Ping",
      name: "Ping Core Router (AIS)",
      target: "172.168.10.1",
    },
    {
      category: "Network System",
      type: "Ping",
      name: "Ping True Router",
      target: "172.168.20.1",
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
      name: "Ping 8.8.8.8 (Internet Check)",
      target: "8.8.8.8",
    },

    // --- เว็บไซต์ภายนอก (Web Access Check) ---
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

    // --- เซิร์ฟเวอร์และบริการสำรอง (Server & Backup) ---
    {
      category: "Server System",
      type: "Ping",
      name: "Ping Domain Controller",
      target: "192.168.9.241",
    },
    {
      category: "Server System",
      type: "Ping",
      name: "Ping HRCI Program",
      target: "192.168.9.242",
    },
    {
      category: "Server System",
      type: "Ping",
      name: "Ping Server EMPSVR03",
      target: "192.168.9.243",
    },
        {
      category: "Server System",
      type: "Ping",
      name: " Ping CD-Organize",
      target: "192.168.9.244",
    },
    {
      category: "Server System",
      type: "Ping",
      name: "Backup Data",
      target: "192.168.9.249",
    },
  ],
};
