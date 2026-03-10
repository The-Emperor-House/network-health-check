const config = require('../config');
const { runPingCheck, runWebAccessCheck, runTcpPortCheck } = require('../utils/networkUtils');
const BaseCollector = require('../utils/BaseCollector');

/**
 * ช่วยเลือก Emoji ตามประเภทอุปกรณ์
 */
function getEmoji(check) {
    const iconMap = {
        'Printer Device': '🖨️',
        'Web': '🌐',
        'TCP': '🔌',
        'Router': '🛡️',
        'Firewall': '🛡️',
        'Gateway': '🛡️',
        'Domain Controller': '💻',
        'DNS': '💻',
        'Internet': '🌍'
    };

    // ค้นหาจากหมวดหมู่ก่อน ถ้าไม่มีให้หาจากคำสำคัญในชื่อ
    if (iconMap[check.category]) return iconMap[check.category];
    if (iconMap[check.type]) return iconMap[check.type];
    
    const key = Object.keys(iconMap).find(k => check.name.includes(k));
    return iconMap[key] || '🔗';
}

async function runNetworkChecks() {
    const collector = new BaseCollector("Network Connectivity", "Network Health");

    // 1. รันการตรวจสอบทั้งหมดพร้อมกัน (Parallel)
    const results = await Promise.all(config.NETWORK_CHECKS.map(async (check) => {
        let res;
        if (check.type === "Ping") res = await runPingCheck(check);
        else if (check.type === "Web") res = await runWebAccessCheck(check);
        else if (check.type === "TCP") res = await runTcpPortCheck(check);
        return { ...check, result: res };
    }));

    // 2. จัดกลุ่ม Category และจัดเรียง
    const sortedResults = results.sort((a, b) => 
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );

    let currentCategory = null;

    // 3. นำข้อมูลใส่เข้าไปใน Collector
    sortedResults.forEach(item => {
        if (item.category !== currentCategory) {
            currentCategory = item.category;
            collector.addHeader(`กลุ่ม: ${currentCategory}`);
        }
        collector.addDetail(
            `${getEmoji(item)} ${item.name}`, 
            item.result.detail, 
            item.result.status
        );
    });

    return collector.report;
}

module.exports = { runNetworkChecks };