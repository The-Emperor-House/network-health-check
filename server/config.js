const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

module.exports = {
  // GBB100 Environment Monitor
  GBB100: {
    URL: process.env.GBB100_URL,
    TEMP_THRESHOLD: 28,
  },

  // Unifi Controller
  UNIFI: {
    IP: process.env.UNIFI_IP,
    PORT: process.env.UNIFI_PORT || 8443,
    USERNAME: process.env.UNIFI_USERNAME,
    PASSWORD: process.env.UNIFI_PASSWORD,
    CLIENT_THRESHOLD: 150,
  },

  // Network Checks
  NETWORK_CHECKS: [
    // Printer Devices
    { category: "Printer Device", type: "Ping", name: "Printer C3922 Floor1",       target: "192.168.9.211" },
    { category: "Printer Device", type: "Ping", name: "Printer C3320 Floor2",       target: "192.168.9.212" },
    { category: "Printer Device", type: "Ping", name: "Printer 2006N Floor3 (CO)",  target: "192.168.9.213" },
    { category: "Printer Device", type: "Ping", name: "Printer L15150 Floor3 (HR)", target: "192.168.9.220" },
    { category: "Printer Device", type: "Ping", name: "Printer HL-1210W (MD Room)", target: "192.168.9.217" },
    { category: "Printer Device", type: "Ping", name: "Printer 2006N Floor4 (AC)",  target: "192.168.9.214" },
    { category: "Printer Device", type: "Ping", name: "Printer BP5100DW Floor4 (AC)", target: "192.168.9.218" },

    // Network System
    { category: "Network System", type: "Ping", name: "Core Router (AIS)",         target: "172.168.10.1" },
    { category: "Network System", type: "Ping", name: "True Router",               target: "172.168.20.1" },
    { category: "Network System", type: "Ping", name: "Firewall",                  target: "192.168.9.1" },
    { category: "Network System", type: "Ping", name: "Internet (8.8.8.8)",        target: "8.8.8.8" },

    // Web Services
    { category: "Web Services", type: "Web", name: "Emperor House",    url: "https://www.emperorhouse.com" },
    { category: "Web Services", type: "Web", name: "ACARA BY EMPEROR", url: "https://www.acara.in.th" },
    { category: "Web Services", type: "Web", name: "LeoAngelo",        url: "https://leoangelo.co.th" },
    { category: "Web Services", type: "Web", name: "TAURUS Renovation",url: "https://taurusrenovation.com" },

    // Server System
    { category: "Server System", type: "Ping", name: "Domain Controller", target: "192.168.9.241" },
    { category: "Server System", type: "Ping", name: "HRCI Program",      target: "192.168.9.242" },
    { category: "Server System", type: "Ping", name: "EMPSVR03",          target: "192.168.9.243" },
    { category: "Server System", type: "Ping", name: "CD-Organize",       target: "192.168.9.244" },
    { category: "Server System", type: "Ping", name: "Backup Data",       target: "192.168.9.249" },
  ],
};
