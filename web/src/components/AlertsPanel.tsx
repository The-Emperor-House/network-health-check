import { AlertItem } from "@/types";

function AlertRow({ alert }: { alert: AlertItem }) {
  const warn = alert.status === "UP_W";
  return (
    <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100 gap-2">
      <span
        className={`text-xs font-semibold truncate ${warn ? "text-amber-700" : "text-red-700"}`}
      >
        • [{alert.category}] {alert.check}
      </span>
      <span
        className={`
          shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase
          ${warn ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}
        `}
      >
        {alert.result}
      </span>
    </div>
  );
}

export default function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Panel Header */}
      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          🚨 Summary of Issues
        </h2>
        <span className="bg-red-100 text-red-600 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
          {alerts.length} {alerts.length === 1 ? "Issue" : "Issues"}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[56px]">
        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
            {alerts.map((alert, i) => (
              <AlertRow key={i} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-600 font-bold text-sm py-1">
            ✅ ทุกระบบทำงานได้ตามปกติ — All systems operational
          </div>
        )}
      </div>
    </div>
  );
}
