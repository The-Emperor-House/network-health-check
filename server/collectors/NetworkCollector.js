const config = require("../config");
const { runPingCheck, runWebAccessCheck, runTcpPortCheck } = require("../utils/networkUtils");
const BaseCollector = require("../utils/BaseCollector");

const EMOJI_MAP = {
  "Printer Device": "🖨️",
  "Web Services":   "🌐",
  "Network System": "🌐",
  "Server System":  "🖥️",
  Web: "🌐",
  TCP: "🔌",
};

function getEmoji(check) {
  return EMOJI_MAP[check.category] || EMOJI_MAP[check.type] || "🔗";
}

async function runNetworkChecks() {
  const collector = new BaseCollector("Network Connectivity", "Network Health");

  const results = await Promise.all(
    config.NETWORK_CHECKS.map(async (check) => {
      let res;
      if      (check.type === "Ping") res = await runPingCheck(check);
      else if (check.type === "Web")  res = await runWebAccessCheck(check);
      else if (check.type === "TCP")  res = await runTcpPortCheck(check);
      return { ...check, result: res };
    })
  );

  const sorted = results.sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  let currentCategory = null;
  sorted.forEach((item) => {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      collector.addHeader(`${currentCategory}`);
    }
    collector.addDetail(`${getEmoji(item)} ${item.name}`, item.result.detail, item.result.status);
  });

  return collector.report;
}

module.exports = { runNetworkChecks };
