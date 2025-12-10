const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// *** เกณฑ์ (Thresholds) อ้างอิงจาก Alarm Settings และค่ามาตรฐาน ***
const TEMP_LOW_THRESHOLD = 15.0;
const TEMP_HIGH_THRESHOLD = 28.0;
const HUMIDITY_LOW_THRESHOLD = 40.0;
const HUMIDITY_HIGH_THRESHOLD = 60.0;
const AC_FAIL_THRESHOLD = 60.0; // นาที (ค่าต้องไม่ต่ำกว่านี้)

/**
 * ตรวจสอบค่าเทียบกับเกณฑ์และให้สถานะ/ข้อความภาษาไทย
 * @param {number|NaN} value - ค่าที่วัดได้ (อาจเป็น NaN หากแปลงไม่ได้)
 * @param {number} low - เกณฑ์ต่ำสุด
 * @param {number} high - เกณฑ์สูงสุด
 * @param {string} unit - หน่วยวัด
 * @returns {object} { status: 'UP'/'UP_W'/'DOWN'/'UNKNOWN', statusText: 'พอดี (OK)'/ 'ต่ำเกินไป'/ 'สูงเกินไป'/ 'ไม่พบข้อมูล' }
 */
function getStatus(value, low, high, unit) {
  if (isNaN(value) || value === null || value === "") {
    return { status: "UNKNOWN", statusText: "ไม่พบข้อมูล/ไม่สามารถอ่านค่าได้" };
  }

  let statusText = "พอดี (OK)";
  let status = "UP";
  if (low !== null && value < low) {
    statusText = `ต่ำเกินไป (< ${low} ${unit})`;
    status = "UP_W";
  } else if (high !== null && value > high) {
    statusText = `สูงเกินไป (> ${high} ${unit})`;
    status = "UP_W";
  } // สถานะไฟฟ้าล้มเหลว (ถือเป็น DOWN หากค่าต่ำกว่าเกณฑ์)
  if (unit === "นาที" && statusText.includes("ต่ำเกินไป")) {
    status = "DOWN";
  }
  return { status, statusText };
}

async function collectGBB100Status() {
  let overallStatus = "UP";

  /**
   * Helper function: ดึงค่าจาก HTML โดยใช้ Selector และ Index
   * @param {object} $ - Cheerio object
   * @param {string} label - ชื่อค่าที่จะค้นหา (เช่น "Temperature")
   * @param {number} index - ลำดับของค่าที่ปรากฏ (0, 1, 2, 3,...)
   * @returns {string} ค่าข้อความของเซนเซอร์ที่ล้างหน่วยแล้ว
   */
  function getIndexedSensorValue($, label, index) {
    // ค้นหา td ที่มี label, เลือกตาม index, แล้วไปที่ td ถัดไปเพื่อดึงค่า
    const text = $('td:contains("' + label + '")')
      .eq(index)
      .next("td")
      .text()
      .trim();
    // ล้างหน่วยวัดทั้งหมดที่อาจติดมา
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
    const $ = cheerio.load(response.data); // --- 1. ดึงค่าจาก HTML ---
    // GBB100 Main Block
    const mainTempStr = getIndexedSensorValue($, "Temperature", 0);
    const mainHumidityStr = $('td:contains("Humidity")')
      .eq(0)
      .next("td")
      .text()
      .trim()
      .replace(" %", "")
      .trim();
    const mainDewpointStr = $('td:contains("Dewpoint")')
      .eq(0)
      .next("td")
      .text()
      .trim()
      .replace(" °C", "")
      .trim();
    const mainSmoke1Str = $('td:contains("Smoke_1")')
      .eq(0)
      .next("td")
      .text()
      .trim();
    const mainSmoke2Str = $('td:contains("Smoke_2")')
      .eq(0)
      .next("td")
      .text()
      .trim();
    const acFailOutletStr = $('td:contains("AC Fail_OUTLET")')
      .eq(0)
      .next("td")
      .text()
      .trim();
    const acFailPduStr = $('td:contains("AC Fail_PDU")')
      .eq(0)
      .next("td")
      .text()
      .trim();

    // Temp Sensors (ใช้ Index 1, 2, 3)
    const temp1RawStr = getIndexedSensorValue($, "Temperature", 1);
    const temp2RawStr = getIndexedSensorValue($, "Temperature", 2);
    const temp3RawStr = getIndexedSensorValue($, "Temperature", 3); // --- 2. แปลงและตรวจสอบค่า ---
    const mainTemp = parseFloat(mainTempStr) || NaN;
    const mainHumidity = parseFloat(mainHumidityStr) || NaN;
    const acFailOutlet = parseFloat(acFailOutletStr) || NaN;
    const acFailPdu = parseFloat(acFailPduStr) || NaN;

    const tempCheck = getStatus(
      mainTemp,
      TEMP_LOW_THRESHOLD,
      TEMP_HIGH_THRESHOLD,
      "°C"
    );
    const humidityCheck = getStatus(
      mainHumidity,
      HUMIDITY_LOW_THRESHOLD,
      HUMIDITY_HIGH_THRESHOLD,
      "%"
    );
    const acFailOutletCheck = getStatus(
      acFailOutlet,
      AC_FAIL_THRESHOLD,
      null,
      "นาที"
    );
    const acFailPduCheck = getStatus(
      acFailPdu,
      AC_FAIL_THRESHOLD,
      null,
      "นาที"
    );

    // แปลงและเช็คสถานะอุณหภูมิเซนเซอร์ย่อย
    const temp1Val = parseFloat(temp1RawStr) || NaN;
    const temp2Val = parseFloat(temp2RawStr) || NaN;
    const temp3Val = parseFloat(temp3RawStr) || NaN;

    const temp1Check = getStatus(
      temp1Val,
      TEMP_LOW_THRESHOLD,
      TEMP_HIGH_THRESHOLD,
      "°C"
    );
    const temp2Check = getStatus(
      temp2Val,
      TEMP_LOW_THRESHOLD,
      TEMP_HIGH_THRESHOLD,
      "°C"
    );
    const temp3Check = getStatus(
      temp3Val,
      TEMP_LOW_THRESHOLD,
      TEMP_HIGH_THRESHOLD,
      "°C"
    ); // --- 3. สร้างรายละเอียดในรูปแบบตาราง ---

    report.details.push(
      {
        check: "Header",
        result: "ตารางสรุปสถานะเซนเซอร์หลัก GBB100",
        status: "HEADER",
      }, // เพิ่มสถานะ HEADER
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
        result: `Smoke 1: ${mainSmoke1Str}, Smoke 2: ${mainSmoke2Str} | OK (0.00)`,
        status:
          mainSmoke1Str === "0.00" && mainSmoke2Str === "0.00" ? "UP" : "UP_W",
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
      // เพิ่มส่วน Temp Sensor ย่อย
      {
        check: "Header",
        result: "ตารางสรุปสถานะเซนเซอร์อุณหภูมิย่อย",
        status: "HEADER",
      }, // เพิ่มสถานะ HEADER
      {
        check: "Temp Sensor 1",
        result: `${temp1RawStr} ${
          temp1Val ? "°C" : ""
        } | เกณฑ์: ${TEMP_LOW_THRESHOLD}-${TEMP_HIGH_THRESHOLD}°C | ${
          temp1Check.statusText
        }`,
        status: temp1Check.status,
      },
      {
        check: "Temp Sensor 2",
        result: `${temp2RawStr} ${
          temp2Val ? "°C" : ""
        } | เกณฑ์: ${TEMP_LOW_THRESHOLD}-${TEMP_HIGH_THRESHOLD}°C | ${
          temp2Check.statusText
        }`,
        status: temp2Check.status,
      },
      {
        check: "Temp Sensor 3",
        result: `${temp3RawStr} ${
          temp3Val ? "°C" : ""
        } | เกณฑ์: ${TEMP_LOW_THRESHOLD}-${TEMP_HIGH_THRESHOLD}°C | ${
          temp3Check.statusText
        }`,
        status: temp3Check.status,
      },
      {
        check: "หมายเหตุ",
        result: "ค่าที่แสดงเป็นค่าปัจจุบันจากเซนเซอร์ GBB100 ทั้งหมด",
        status: "INFO",
      }
    ); // --- 4. สรุปสถานะรวม ---

    if (
      acFailOutletCheck.status === "DOWN" ||
      acFailPduCheck.status === "DOWN"
    ) {
      overallStatus = "DOWN";
    } else if (
      tempCheck.status === "UP_W" ||
      humidityCheck.status === "UP_W" ||
      temp1Check.status === "UP_W" ||
      temp1Check.status === "UNKNOWN" ||
      temp2Check.status === "UP_W" ||
      temp2Check.status === "UNKNOWN" ||
      temp3Check.status === "UP_W" ||
      temp3Check.status === "UNKNOWN"
    ) {
      overallStatus = "UP_W";
    }
    report.status = overallStatus;
  } catch (error) {
    report.status = "DOWN";
    report.details.push({
      check: "Web Scraping Access",
      result: `ข้อผิดพลาด: ${error.message || "ไม่สามารถเชื่อมต่อได้"}`,
      status: "DOWN",
    });
  }
  return report;
}

module.exports = { collectGBB100Status };
