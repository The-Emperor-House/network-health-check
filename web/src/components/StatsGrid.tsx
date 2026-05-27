import { DashboardData } from "@/types";

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  borderAccent?: string;
}

function StatCard({ label, value, color, borderAccent }: StatCardProps) {
  return (
    <div
      className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm ${borderAccent ?? ""}`}
    >
      <p className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</p>
      <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default function StatsGrid({ data }: { data: DashboardData }) {
  const total = data.results?.reduce((acc, r) => acc + r.details.length, 0) ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Checks"   value={total}                  color="text-slate-700" />
      <StatCard label="Operational"    value={data.upCount ?? 0}      color="text-green-600" />
      <StatCard label="Warnings"       value={data.warningCount ?? 0} color="text-amber-600" borderAccent="border-l-4 border-l-amber-400" />
      <StatCard label="Critical Issues" value={data.downCount ?? 0}   color="text-red-600"   borderAccent="border-l-4 border-l-red-500"   />
    </div>
  );
}
