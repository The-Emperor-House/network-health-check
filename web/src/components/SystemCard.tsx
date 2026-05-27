import { DetailItem, SystemReport, Status } from "@/types";
import StatusBadge from "./StatusBadge";

const cardBorder: Record<string, string> = {
  UP:      "border-slate-200",
  UP_W:    "border-amber-200",
  DOWN:    "border-red-200",
  UNKNOWN: "border-slate-200",
};

function DetailRow({ detail }: { detail: DetailItem }) {
  if (detail.status === "HEADER") {
    return (
      <div className="px-3 py-1 text-[10px] font-black text-blue-600 uppercase tracking-wide bg-blue-50/60 rounded-md mt-1">
        {detail.result}
      </div>
    );
  }

  const pulse =
    detail.status === "DOWN"
      ? "bg-red-500"
      : detail.status === "UP_W"
        ? "bg-amber-400"
        : null;

  return (
    <div className="px-3 py-1.5 flex justify-between items-center group hover:bg-slate-50 rounded-lg transition-colors">
      <span className="text-[11px] text-slate-500 font-medium group-hover:text-slate-700 transition-colors truncate mr-3">
        {detail.check}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-bold text-slate-800">{detail.result}</span>
        {pulse && (
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${pulse}`} />
        )}
      </div>
    </div>
  );
}

export default function SystemCard({ report }: { report: SystemReport }) {
  return (
    <div
      className={`
        bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${cardBorder[report.status] ?? "border-slate-200"}
      `}
    >
      {/* Card Header */}
      <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100 bg-slate-50/60">
        <span className="text-[13px] font-bold text-slate-700 truncate mr-2">
          {report.name}
        </span>
        <StatusBadge status={report.status as Status} />
      </div>

      {/* Details */}
      <div className="p-2 space-y-0.5">
        {report.details.map((detail, i) => (
          <DetailRow key={i} detail={detail} />
        ))}
      </div>
    </div>
  );
}
