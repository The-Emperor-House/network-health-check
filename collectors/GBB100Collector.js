const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");
const { getStatus } = require("../utils/reportUtils");

// *** เกณฑ์การตัดสินสถานะ (Thresholds) ***
const TEMP_LOW_THRESHOLD = 15.0;
const TEMP_HIGH_THRESHOLD = 28.0;
const HUMIDITY_LOW_THRESHOLD = 40.0;
const HUMIDITY_HIGH_THRESHOLD = 60.0;
const AC_FAIL_THRESHOLD = 60.0; // นาที

async function collectGBB100Status() {
  let overallStatus = "UP";

  /**
   * Helper function: ช่วยดึงตัวเลขออกจาก HTML
   * @param {object} $ - Cheerio object ที่โหลด HTML มาแล้ว
   * @param {string} label - ข้อความที่ต้องการค้นหาใน <td>
   * @param {number} index - ลำดับที่พบ (กรณีชื่อซ้ำกัน)
   */
  function getIndexedSensorValue($, label, index) {
    const text = $('td:contains("' + label + '")')
      .eq(index)
      .next("td")
      .text()
      .trim();
    // ลบหน่วยวัดออกให้เหลือแต่ตัวเลข
    return text.replace(" °C", "").replace(" %", "").trim();
  }

  const report = {
    name: "GBB100 Environment Monitor",
    category: "Data Center Environment",
    status: "UP",
    details: [],
  };

  try {
    const gbb = config.GBB100;
    const response = await axios.get(gbb.URL, { timeout: 5000 });
    const $ = cheerio.load(response.data);

    // --- 1. ดึงค่าจากเซนเซอร์หลัก ---
    const mainTempStr = getIndexedSensorValue($, "Temperature", 0);
    const mainHumidityStr = getIndexedSensorValue($, "Humidity", 0);
    const mainDewpointStr = getIndexedSensorValue($, "Dewpoint", 0);
    const mainSmoke1Str = getIndexedSensorValue($, "Smoke_1", 0);
    const mainSmoke2Str = getIndexedSensorValue($, "Smoke_2", 0);
    const acFailOutletStr = getIndexedSensorValue($, "AC Fail_OUTLET", 0);
    const acFailPduStr = getIndexedSensorValue($, "AC Fail_PDU", 0);

    // --- 2. ดึงค่าจากเซนเซอร์อุณหภูมิย่อย (Index 1, 2, 3) ---
    const temp1RawStr = getIndexedSensorValue($, "Temperature", 1);
    const temp2RawStr = getIndexedSensorValue($, "Temperature", 2);
    const temp3RawStr = getIndexedSensorValue($, "Temperature", 3);

    // --- 3. แปลงค่าเป็นตัวเลขและตรวจสอบสถานะ ---
    const mainTemp = parseFloat(mainTempStr) || NaN;
    const mainHumidity = parseFloat(mainHumidityStr) || NaN;
    const acFailOutlet = parseFloat(acFailOutletStr) || NaN;
    const acFailPdu = parseFloat(acFailPduStr) || NaN;

    const tempCheck = getStatus(mainTemp, TEMP_LOW_THRESHOLD, TEMP_HIGH_THRESHOLD, "°C");
    const humidityCheck = getStatus(mainHumidity, HUMIDITY_LOW_THRESHOLD, HUMIDITY_HIGH_THRESHOLD, "%");
    const acFailOutletCheck = getStatus(acFailOutlet, AC_FAIL_THRESHOLD, null, "นาที");
    const acFailPduCheck = getStatus(acFailPdu, AC_FAIL_THRESHOLD, null, "นาที");

    const temp1Val = parseFloat(temp1RawStr) || NaN;
    const temp2Val = parseFloat(temp2RawStr) || NaN;
    const temp3Val = parseFloat(temp3RawStr) || NaN;

    const temp1Check = getStatus(temp1Val, TEMP_LOW_THRESHOLD, TEMP_HIGH_THRESHOLD, "°C");
    const temp2Check = getStatus(temp2Val, TEMP_LOW_THRESHOLD, TEMP_HIGH_THRESHOLD, "°C");
    const temp3Check = getStatus(temp3Val, TEMP_LOW_THRESHOLD, TEMP_HIGH_THRESHOLD, "°C");

    // --- 4. บันทึกรายละเอียดลงใน Report ---
    report.details.push(
      { check: "Header", result: "ตารางสรุปสถานะเซนเซอร์หลัก GBB100", status: "HEADER" },
      {
        check: "อุณหภูมิห้อง (Main)",
        result: `${mainTempStr} °C | เกณฑ์: ${TEMP_LOW_THRESHOLD}-${TEMP_HIGH_THRESHOLD}°C | ${tempCheck.statusText}`,
        status: tempCheck.status,
      },
      {
        check: "ความชื้น (Humidity)",
        result: `${mainHumidityStr} % | เกณฑ์: ${HUMIDITY_LOW_THRESHOLD}-${HUMIDITY_HIGH_THRESHOLD}% | ${humidityCheck.statusText}`,
        status: humidityCheck.status,
      },
      {
        check: "จุดน้ำค้าง (Dewpoint)",
        result: `${mainDewpointStr} °C | ไม่มีการกำหนดเกณฑ์`,
        status: "INFO",
      },
      {
        check: "Smoke Sensor 1/2",
        result: `Smoke 1: ${mainSmoke1Str}, Smoke 2: ${mainSmoke2Str} | ปกติ (0.00)`,
        status: mainSmoke1Str === "0.00" && mainSmoke2Str === "0.00" ? "UP" : "UP_W",
      },
      {
        check: "AC Fail OUTLET",
        result: `${acFailOutletStr} นาที | เกณฑ์: ≥ ${AC_FAIL_THRESHOLD} นาที | ${acFailOutletCheck.statusText}`,
        status: acFailOutletCheck.status,
      },
      {
        check: "AC Fail PDU",
        result: `${acFailPduStr} นาที | เกณฑ์: ≥ ${AC_FAIL_THRESHOLD} นาที | ${acFailPduCheck.statusText}`,
        status: acFailPduCheck.status,
      },
      { check: "Header", result: "ตารางสรุปสถานะเซนเซอร์อุณหภูมิย่อย", status: "HEADER" },
      {
        check: "Temp Sensor 1",
        result: `${temp1RawStr} ${temp1Val ? "°C" : ""} | ${temp1Check.statusText}`,
        status: temp1Check.status,
      },
      {
        check: "Temp Sensor 2",
        result: `${temp2RawStr} ${temp2Val ? "°C" : ""} | ${temp2Check.statusText}`,
        status: temp2Check.status,
      },
      {
        check: "Temp Sensor 3",
        result: `${temp3RawStr} ${temp3Val ? "°C" : ""} | ${temp3Check.statusText}`,
        status: temp3Check.status,
      }
    );

    // --- 5. สรุปสถานะรวม ---
    if (acFailOutletCheck.status === "DOWN" || acFailPduCheck.status === "DOWN") {
      overallStatus = "DOWN";
    } else if (
      [tempCheck, humidityCheck, temp1Check, temp2Check, temp3Check].some(c => c.status === "UP_W" || c.status === "UNKNOWN")
    ) {
      overallStatus = "UP_W";
    }
    report.status = overallStatus;

  } catch (error) {
    report.status = "DOWN";
    report.details.push({
      check: "Web Scraping Access",
      result: `ข้อผิดพลาด: ${error.message}`,
      status: "DOWN",
    });
  }
  return report;
}

module.exports = { collectGBB100Status };