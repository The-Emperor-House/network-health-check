const config = require('../config');
const { runPingCheck, runWebAccessCheck, runTcpPortCheck } = require('../utils/networkUtils');
const BaseCollector = require('../utils/BaseCollector');

/**
 * ฟังก์ชันช่วยเลือก Emoji ตามประเภทอุปกรณ์หรือหมวดหมู่
 * เพื่อให้รายงานของคุณพิมุกต์ดูง่ายและสวยงาม
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

    // 1. ค้นหาจากหมวดหมู่ (Category) ก่อน
    if (iconMap[check.category]) return iconMap[check.category];
    // 2. ถ้าไม่เจอ ให้หาจากประเภทการตรวจสอบ (Type)
    if (iconMap[check.type]) return iconMap[check.type];
    
    // 3. ถ้ายังไม่เจออีก ให้หาจากคำสำคัญที่มีอยู่ในชื่อ (Name)
    const key = Object.keys(iconMap).find(k => check.name.includes(k));
    return iconMap[key] || '🔗'; // ถ้าไม่เข้าพวกเลย ให้ใส่ไอคอนโซ่เชื่อมต่อ
}

/**
 * ฟังก์ชันหลักในการรันการตรวจสอบเครือข่ายทั้งหมด
 */
async function runNetworkChecks() {
    const collector = new BaseCollector("Network Connectivity", "Network Health");

    // 1. รันการตรวจสอบทั้งหมดพร้อมกัน (Parallel) เพื่อความรวดเร็ว
    const results = await Promise.all(config.NETWORK_CHECKS.map(async (check) => {
        let res;
        // แยก Logic การตรวจสอบตามประเภทที่กำหนดใน Config
        if (check.type === "Ping") res = await runPingCheck(check);
        else if (check.type === "Web") res = await runWebAccessCheck(check);
        else if (check.type === "TCP") res = await runTcpPortCheck(check);
        
        // คืนค่าข้อมูลเดิมพร้อมผลลัพธ์การตรวจสอบ (result)
        return { ...check, result: res };
    }));

    // 2. จัดกลุ่ม Category และเรียงลำดับตามตัวอักษร
    const sortedResults = results.sort((a, b) => 
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );

    let currentCategory = null;

    // 3. นำข้อมูลใส่เข้าไปใน Collector เพื่อเตรียมสร้างรายงาน
    sortedResults.forEach(item => {
        // ถ้าเป็นกลุ่มใหม่ ให้เพิ่มหัวข้อ Header ขั้น
        if (item.category !== currentCategory) {
            currentCategory = item.category;
            collector.addHeader(`กลุ่ม: ${currentCategory}`);
        }
        
        // ใส่รายละเอียด: "ไอคอน ชื่ออุปกรณ์", "ผลการตรวจ", "สถานะ (UP/DOWN)"
        collector.addDetail(
            `${getEmoji(item)} ${item.name}`, 
            item.result.detail, 
            item.result.status
        );
    });

    // ส่งรายงานสรุปกลับไป
    return collector.report;
}

module.exports = { runNetworkChecks };