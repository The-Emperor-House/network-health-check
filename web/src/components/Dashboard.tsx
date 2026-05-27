"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
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
  const [isExporting, setIsExporting] = useState(false);
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

    /* Initial load via REST */
    fetch(`${BACKEND_URL}/api/status`)
      .then((r) => r.json())
      .then((d) => mounted && setData(d))
      .catch(() => {/* server may not be ready yet */});

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
    };
  }, []);

  /* ── Refresh ── */
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetch(`${BACKEND_URL}/api/trigger-check`, { method: "POST" });
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 2_000);
    }
  };

  /* ── Export PNG ── */
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const el = document.getElementById("dashboard-export");
      if (!el) return;

      const { toPng } = await import("html-to-image");

      /* Temporarily append a generation-time footer */
      const footer = document.createElement("div");
      footer.style.cssText = [
        "text-align:center",
        "padding:12px 24px",
        "margin-top:16px",
        "font-size:11px",
        "color:#94a3b8",
        "font-family:Inter,Roboto,sans-serif",
        "border-top:1px solid #e2e8f0",
      ].join(";");
      footer.textContent = `Generated: ${new Date().toLocaleString("th-TH", {
        dateStyle: "full",
        timeStyle: "medium",
      })}`;
      el.appendChild(footer);

      /* Capture */
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#f0f4f8",
        /* Exclude action-buttons from the PNG */
        filter: (node) => {
          if (
            node instanceof HTMLElement &&
            node.dataset.noExport === "true"
          ) {
            return false;
          }
          return true;
        },
      });

      el.removeChild(footer);

      /* Download */
      const dateSlug = new Date().toISOString().slice(0, 10);
      const link = document.createElement("a");
      link.download = `IT-Health-Report-${dateSlug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box id="dashboard-export" sx={{ maxWidth: 1280, mx: "auto" }}>
      <Stack spacing={3}>
        <Header
          lastUpdate={data?.lastUpdate}
          isConnected={isConnected}
          isRefreshing={isRefreshing}
          isExporting={isExporting}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        {data ? (
          <>
            <StatsGrid data={data} />
            <AlertsPanel alerts={data.alerts ?? []} />
            <SystemsGrid results={data.results ?? []} />
          </>
        ) : (
          /* Loading state */
          <Stack
            spacing={2}
            sx={{ py: 18, alignItems: "center", justifyContent: "center" }}
          >
            <CircularProgress size={40} thickness={3} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
              กำลังเชื่อมต่อ Monitoring Server…
            </Typography>
            <Typography variant="caption" color="text.disabled">
              รอรับข้อมูลจาก{" "}
              <Box
                component="code"
                sx={{
                  bgcolor: "grey.100",
                  color: "text.secondary",
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                }}
              >
                {BACKEND_URL}
              </Box>
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
