import { SystemReport } from "@/types";
import SystemCard from "./SystemCard";

export default function SystemsGrid({ results }: { results: SystemReport[] }) {
  // จัดกลุ่มตาม category
  const grouped = results.reduce<Record<string, SystemReport[]>>((acc, report) => {
    const cat = report.category || "General";
    (acc[cat] ??= []).push(report);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, reports]) => (
        <section key={category}>
          {/* Category Heading */}
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
              {category}
            </h3>
            <div className="h-px bg-slate-200 flex-grow" />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map((report, i) => (
              <SystemCard key={i} report={report} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
