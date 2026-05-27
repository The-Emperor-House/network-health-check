import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { AlertItem } from "@/types";

function AlertRow({ alert }: { alert: AlertItem }) {
  const isWarn = alert.status === "UP_W";
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.875,
        borderRadius: 2,
        bgcolor: isWarn ? "rgba(237,108,2,0.06)" : "rgba(198,40,40,0.06)",
        border: "1px solid",
        borderColor: isWarn ? "rgba(237,108,2,0.2)" : "rgba(198,40,40,0.2)",
      }}
    >
      <Typography
        variant="caption"
        noWrap
        sx={{
          fontWeight: 600,
          color: isWarn ? "warning.dark" : "error.dark",
          minWidth: 0,
        }}
      >
        [{alert.category}] {alert.check}
      </Typography>
      <Chip
        label={alert.result}
        size="small"
        color={isWarn ? "warning" : "error"}
        sx={{
          fontWeight: 800,
          fontSize: "0.58rem",
          height: 18,
          flexShrink: 0,
          "& .MuiChip-label": { px: 0.75 },
        }}
      />
    </Box>
  );
}

export default function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Paper sx={{ overflow: "hidden" }}>
      {/* Panel header */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: "grey.50",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ErrorOutlineRoundedIcon
            sx={{
              fontSize: 18,
              color: alerts.length > 0 ? "error.main" : "success.main",
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700 }} color="text.primary">
            Summary of Issues
          </Typography>
        </Stack>
        <Chip
          label={`${alerts.length} ${alerts.length === 1 ? "Issue" : "Issues"}`}
          size="small"
          color={alerts.length > 0 ? "error" : "success"}
          sx={{ fontWeight: 700, fontSize: "0.65rem" }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {alerts.length > 0 ? (
          <Grid container spacing={1}>
            {alerts.map((alert, i) => (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <AlertRow alert={alert} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 0.5 }}>
            <CheckCircleOutlineRoundedIcon sx={{ fontSize: 20, color: "success.main" }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }} color="success.main">
              ทุกระบบทำงานได้ตามปกติ — All systems operational
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
