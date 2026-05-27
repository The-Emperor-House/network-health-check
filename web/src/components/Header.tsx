"use client";

import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Avatar from "@mui/material/Avatar";
import Image from "next/image";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

interface Props {
  lastUpdate?: string;
  isConnected: boolean;
  isRefreshing: boolean;
  isExporting: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export default function Header({
  lastUpdate,
  isConnected,
  isRefreshing,
  isExporting,
  onRefresh,
  onExport,
}: Props) {
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        {/* Left: Icon + Title */}
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: "transparent",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Image
              src="/icon.png"
              alt="Monitor IT"
              width={48}
              height={48}
              style={{ objectFit: "cover" }}
            />
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              color="text.primary"
              sx={{
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              IT Infrastructure Health
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.5 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                Last Update:{" "}
                <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {lastUpdate ?? "Loading…"}
                </Box>
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Right: Actions — excluded from PNG */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center" }}
          data-no-export="true"
        >
          {/* Live / Offline */}
          <Chip
            icon={
              <FiberManualRecordIcon
                sx={{
                  fontSize: "10px !important",
                  color: isConnected ? "success.main" : "error.main",
                }}
              />
            }
            label={isConnected ? "Live" : "Offline"}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 700,
              fontSize: "0.7rem",
              color: isConnected ? "success.main" : "error.main",
              borderColor: isConnected ? "success.main" : "error.main",
              bgcolor: isConnected
                ? "rgba(46,125,50,0.06)"
                : "rgba(198,40,40,0.06)",
            }}
          />

          {/* Refresh */}
          <Tooltip title="Refresh Now">
            <span>
              <IconButton
                onClick={onRefresh}
                disabled={isRefreshing}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  width: 36,
                  height: 36,
                }}
              >
                {isRefreshing ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>

          {/* Export PNG */}
          <Button
            onClick={onExport}
            disabled={isExporting}
            variant="contained"
            size="small"
            disableElevation
            startIcon={
              isExporting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <FileDownloadRoundedIcon fontSize="small" />
              )
            }
            sx={{ px: 2, py: 0.875 }}
          >
            {isExporting ? "Exporting…" : "Export PNG"}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
