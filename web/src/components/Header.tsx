"use client";

import { DashboardData } from "@/types";

interface Props {
  lastUpdate?: string;
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
  data: DashboardData | null;
}

export default function Header({
  lastUpdate,
  isConnected,
  isRefreshing,
  onRefresh,
  onExport,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <div className="bg-blue-600 p-3 rounded-xl shadow-md shadow-blue-200 text-white text-2xl select-none">
          🛡️
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
            IT Infrastructure Health
          </h1>
          <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
            <span>🕒</span>
            <span>Last Update:</span>
            <span className="font-semibold text-slate-600">
              {lastUpdate ?? "Loading…"}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Connection Status */}
        <span
          className={`
            px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
            ${isConnected
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-red-100   text-red-700   border-red-200"}
          `}
        >
          {isConnected ? "● Live" : "● Offline"}
        </span>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Now"
          className={`
            p-2.5 rounded-xl border border-slate-200 text-slate-600
            bg-slate-50 hover:bg-slate-100 transition-all active:scale-95
            ${isRefreshing ? "animate-pulse-soft opacity-60 cursor-not-allowed" : ""}
          `}
        >
          🔄
        </button>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow active:scale-95"
        >
          📸 Export
        </button>
      </div>
    </div>
  );
}
