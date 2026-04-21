class BaseCollector {
  constructor(name, category) {
    this.report = {
      name: name,
      category: category,
      status: "UP",
      details: [],
      timestamp: new Date().toISOString(),
    };
  }

  addDetail(check, result, status, extra = {}) {
    this.report.details.push({ check, result, status, ...extra });
    this.updateOverallStatus();
  }

  addHeader(label) {
    this.report.details.push({
      check: "Header",
      result: label,
      status: "HEADER",
    });
  }

  updateOverallStatus() {
    const details = this.report.details;
    // ลำดับความสำคัญ: DOWN > UP_W > UNKNOWN > UP
    if (details.some((d) => d.status === "DOWN")) {
      this.report.status = "DOWN";
    } else if (details.some((d) => d.status === "UP_W")) {
      this.report.status = "UP_W";
    } else if (details.some((d) => d.status === "UNKNOWN")) {
      this.report.status = "UP_W";
    } else {
      this.report.status = "UP";
    }
  }

  handleError(error) {
    this.report.status = "DOWN";
    // เก็บชื่อ Error และ Message แยกกันเพื่อความชัดเจน
    this.addDetail("System Error", `${error.name}: ${error.message}`, "DOWN");
    return this.report;
  }
}

module.exports = BaseCollector;