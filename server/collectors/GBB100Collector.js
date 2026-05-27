const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");
const { getStatus } = require("../utils/reportUtils");

const TEMP_LOW = 15.0;
const TEMP_HIGH = 28.0;
const HUMIDITY_LOW = 40.0;
const HUMIDITY_HIGH = 60.0;
const AC_FAIL_MIN = 60.0;

function getSensorValue($, label, index) {
  const text = $(`td:contains("${label}")`).eq(index).next("td").text().trim();
  return text.replace(" °C", "").replace(" %", "").trim();
}

async function collectGBB100Status() {
  const report = {
    name: "GBB100 Environment Monitor",
    category: "Data Center Environment",
    status: "UP",
    details: [],
  };

  try {
    const response = await axios.get(config.GBB100.URL, { timeout: 5000 });
    const $ = cheerio.load(response.data);

    const mainTempStr    = getSensorValue($, "Temperature",   0);
    const mainHumStr     = getSensorValue($, "Humidity",      0);
    const mainDewStr     = getSensorValue($, "Dewpoint",      0);
    const smoke1Str      = getSensorValue($, "Smoke_1",       0);
    const smoke2Str      = getSensorValue($, "Smoke_2",       0);
    const acOutletStr    = getSensorValue($, "AC Fail_OUTLET",0);
    const acPduStr       = getSensorValue($, "AC Fail_PDU",   0);
    const temp1Str       = getSensorValue($, "Temperature",   1);
    const temp2Str       = getSensorValue($, "Temperature",   2);
    const temp3Str       = getSensorValue($, "Temperature",   3);

    const mainTemp    = parseFloat(mainTempStr) || NaN;
    const mainHum     = parseFloat(mainHumStr)  || NaN;
    const acOutlet    = parseFloat(acOutletStr) || NaN;
    const acPdu       = parseFloat(acPduStr)    || NaN;
    const temp1       = parseFloat(temp1Str)    || NaN;
    const temp2       = parseFloat(temp2Str)    || NaN;
    const temp3       = parseFloat(temp3Str)    || NaN;

    const tempCheck   = getStatus(mainTemp, TEMP_LOW, TEMP_HIGH, "°C");
    const humCheck    = getStatus(mainHum,  HUMIDITY_LOW, HUMIDITY_HIGH, "%");
    const outletCheck = getStatus(acOutlet, AC_FAIL_MIN, null, "นาที");
    const pduCheck    = getStatus(acPdu,    AC_FAIL_MIN, null, "นาที");
    const t1Check     = getStatus(temp1, TEMP_LOW, TEMP_HIGH, "°C");
    const t2Check     = getStatus(temp2, TEMP_LOW, TEMP_HIGH, "°C");
    const t3Check     = getStatus(temp3, TEMP_LOW, TEMP_HIGH, "°C");

    report.details.push(
      { check: "Header", result: "เซนเซอร์หลัก GBB100", status: "HEADER" },
      { check: "อุณหภูมิห้อง (Main)",  result: `${mainTempStr} °C | ${TEMP_LOW}–${TEMP_HIGH}°C | ${tempCheck.statusText}`,   status: tempCheck.status  },
      { check: "ความชื้น (Humidity)",   result: `${mainHumStr} % | ${HUMIDITY_LOW}–${HUMIDITY_HIGH}% | ${humCheck.statusText}`, status: humCheck.status   },
      { check: "จุดน้ำค้าง (Dewpoint)", result: `${mainDewStr} °C | ไม่มีเกณฑ์`, status: "INFO" },
      { check: "Smoke Sensor 1/2",       result: `Smoke 1: ${smoke1Str}, Smoke 2: ${smoke2Str}`, status: smoke1Str === "0.00" && smoke2Str === "0.00" ? "UP" : "UP_W" },
      { check: "AC Fail OUTLET",         result: `${acOutletStr} นาที | ≥ ${AC_FAIL_MIN} นาที | ${outletCheck.statusText}`,   status: outletCheck.status },
      { check: "AC Fail PDU",            result: `${acPduStr} นาที | ≥ ${AC_FAIL_MIN} นาที | ${pduCheck.statusText}`,         status: pduCheck.status   },
      { check: "Header", result: "เซนเซอร์อุณหภูมิย่อย", status: "HEADER" },
      { check: "Temp Sensor 1", result: `${temp1Str} ${temp1 ? "°C" : ""} | ${t1Check.statusText}`, status: t1Check.status },
      { check: "Temp Sensor 2", result: `${temp2Str} ${temp2 ? "°C" : ""} | ${t2Check.statusText}`, status: t2Check.status },
      { check: "Temp Sensor 3", result: `${temp3Str} ${temp3 ? "°C" : ""} | ${t3Check.statusText}`, status: t3Check.status },
    );

    if (outletCheck.status === "DOWN" || pduCheck.status === "DOWN") {
      report.status = "DOWN";
    } else if ([tempCheck, humCheck, t1Check, t2Check, t3Check].some((c) => c.status === "UP_W" || c.status === "UNKNOWN")) {
      report.status = "UP_W";
    }
  } catch (error) {
    report.status = "DOWN";
    report.details.push({ check: "Web Scraping", result: `ข้อผิดพลาด: ${error.message}`, status: "DOWN" });
  }

  return report;
}

module.exports = { collectGBB100Status };
