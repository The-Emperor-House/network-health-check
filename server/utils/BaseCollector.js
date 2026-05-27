class BaseCollector {
  constructor(name, category) {
    this.report = {
      name,
      category,
      status: "UP",
      details: [],
      timestamp: new Date().toISOString(),
    };
  }

  addDetail(check, result, status, extra = {}) {
    this.report.details.push({ check, result, status, ...extra });
    this._updateStatus();
  }

  addHeader(label) {
    this.report.details.push({ check: "Header", result: label, status: "HEADER" });
  }

  _updateStatus() {
    const { details } = this.report;
    if (details.some((d) => d.status === "DOWN")) {
      this.report.status = "DOWN";
    } else if (details.some((d) => d.status === "UP_W" || d.status === "UNKNOWN")) {
      this.report.status = "UP_W";
    } else {
      this.report.status = "UP";
    }
  }

  handleError(error) {
    this.report.status = "DOWN";
    this.addDetail("System Error", `${error.name}: ${error.message}`, "DOWN");
    return this.report;
  }
}

module.exports = BaseCollector;
