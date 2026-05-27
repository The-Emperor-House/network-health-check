import { Status } from "@/types";

const styles: Record<Status, string> = {
  UP:      "bg-green-100 text-green-700 border-green-200",
  UP_W:    "bg-amber-100 text-amber-700 border-amber-200",
  DOWN:    "bg-red-100   text-red-700   border-red-200",
  HEADER:  "bg-blue-50   text-blue-600  border-blue-100",
  INFO:    "bg-slate-100 text-slate-500 border-slate-200",
  UNKNOWN: "bg-slate-100 text-slate-400 border-slate-200",
};

const labels: Record<Status, string> = {
  UP:      "UP",
  UP_W:    "WARN",
  DOWN:    "DOWN",
  HEADER:  "INFO",
  INFO:    "INFO",
  UNKNOWN: "N/A",
};

interface Props {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: Props) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full border
        text-[9px] font-black tracking-tight uppercase shrink-0
        ${styles[status] ?? styles.UNKNOWN}
        ${className}
      `}
    >
      {labels[status]}
    </span>
  );
}
