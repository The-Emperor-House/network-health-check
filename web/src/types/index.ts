export type Status = "UP" | "UP_W" | "DOWN" | "HEADER" | "INFO" | "UNKNOWN";

export interface DetailItem {
  check: string;
  result: string;
  status: Status;
  percent?: number;
  license?: { percent: number } | null;
}

export interface SystemReport {
  name: string;
  category: string;
  status: "UP" | "UP_W" | "DOWN" | "UNKNOWN";
  details: DetailItem[];
  timestamp: string;
  processedAt?: string;
}

export interface AlertItem {
  status: "DOWN" | "UP_W" | "UNKNOWN";
  icon: string;
  name: string;
  category: string;
  check: string;
  result: string;
  timestamp: string;
}

export interface DashboardData {
  totalChecks: number;
  upCount: number;
  warningCount: number;
  downCount: number;
  alerts: AlertItem[];
  results: SystemReport[];
  lastUpdate?: string;
}
