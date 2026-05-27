"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardData } from "@/types";
import Header from "./Header";
import StatsGrid from "./StatsGrid";
import AlertsPanel from "./AlertsPanel";
import SystemsGrid from "./SystemsGrid";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);

  /* ── Socket.io connection ── */
  useEffect(() => {
    let mounted = true;

    async function connect() {
      const { io } = await import("socket.io-client");
      const socket = io(BACKEND_URL, { transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("connect",    () => mounted && setIsConnected(true));
      socket.on("disconnect", () => mounted && setIsConnected(false));
      socket.on("update-dashboard", (d: DashboardData) => {
        if (mounted) setData(d);
      });
    }

    connect();

    /* Initial load via REST (before socket connects) */
    fetch(`${BACKEND_URL}/api/status`)
      .then((r) => r.json())
      .then((d) => mounted && setData(d))
      .catch(() => {/* server not ready yet */});

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
    };
  }, []);

  /* ── Refresh handler ── */
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetch(`${BACKEND_URL}/api/trigger-check`, { method: "POST" });
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  /* ── Export handler ── */
  const handleExport = async () => {
    const el = document.getElementById("dashboard-content");
    if (!el) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8fafc",
        logging: false,
        height: el.scrollHeight + 60,
        onclone: (doc) => {
          const clone = doc.getElementById("dashboard-content");
          if (clone) {
            clone.style.overflow = "visible";
            clone.style.height = "auto";
            clone.style.padding = "30px";
          }
        },
      });

      const link = document.createElement("a");
      link.download = `IT-Health-Report-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div id="dashboard-content" className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Header
        lastUpdate={data?.lastUpdate}
        isConnected={isConnected}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onExport={handleExport}
        data={data}
      />

      {data ? (
        <>
          <StatsGrid data={data} />
          <AlertsPanel alerts={data.alerts ?? []} />
          <SystemsGrid results={data.results ?? []} />
        </>
      ) : (
        /* Loading state */
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <span className="text-5xl animate-pulse">📡</span>
          <p className="font-semibold text-base">กำลังเชื่อมต่อ Monitoring Server…</p>
          <p className="text-sm text-slate-300">
            รอรับข้อมูลจาก{" "}
            <code className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">
              {BACKEND_URL}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
