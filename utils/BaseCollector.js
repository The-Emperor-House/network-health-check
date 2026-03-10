class BaseCollector {
  constructor(name, category) {
    this.report = {
      name: name,
      category: category,
      status: "UP",
      details: [],
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
    if (this.report.details.some((d) => d.status === "DOWN")) {
      this.report.status = "DOWN";
    } else if (
      this.report.details.some(
        (d) => d.status === "UP_W" || d.status === "UNKNOWN",
      )
    ) {
      this.report.status = "UP_W";
    } else {
      this.report.status = "UP";
    }
  }

  handleError(error) {
    this.report.status = "DOWN";
    this.addDetail("Connection Error", error.message, "DOWN");
    return this.report;
  }
}

module.exports = BaseCollector;
