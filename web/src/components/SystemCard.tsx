import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DetailItem, SystemReport, Status } from "@/types";
import StatusBadge from "./StatusBadge";

const borderAccent: Record<string, string> = {
  UP:      "#e2e8f0",
  UP_W:    "#f59e0b",
  DOWN:    "#ef4444",
  UNKNOWN: "#e2e8f0",
};

function DetailRow({ detail }: { detail: DetailItem }) {
  /* ── Section header ── */
  if (detail.status === "HEADER") {
    return (
      <Box
        sx={{
          px: 1.5,
          py: 0.625,
          bgcolor: "rgba(21,101,192,0.06)",
          borderRadius: 1.5,
          mt: 0.75,
          mb: 0.25,
        }}
      >
        <Typography
          variant="caption"
          color="primary"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          {detail.result}
        </Typography>
      </Box>
    );
  }

  const hasPulse = detail.status === "DOWN" || detail.status === "UP_W";

  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.625,
        borderRadius: 1.5,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "background-color 0.15s",
        "&:hover": { bgcolor: "grey.50" },
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        sx={{ fontWeight: 500, mr: 1, minWidth: 0 }}
      >
        {detail.check}
      </Typography>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
        <Typography variant="caption" color="text.primary" sx={{ fontWeight: 700 }}>
          {detail.result}
        </Typography>
        {hasPulse && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: detail.status === "DOWN" ? "error.main" : "warning.main",
              animation: "blink 1.4s ease-in-out infinite",
              "@keyframes blink": {
                "0%, 100%": { opacity: 1 },
                "50%":       { opacity: 0.25 },
              },
            }}
          />
        )}
      </Stack>
    </Box>
  );
}

export default function SystemCard({ report }: { report: SystemReport }) {
  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: `3px solid ${borderAccent[report.status] ?? "#e2e8f0"}`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        },
      }}
    >
      {/* Card header */}
      <CardHeader
        title={
          <Typography variant="body2" color="text.primary" noWrap sx={{ fontWeight: 700 }}>
            {report.name}
          </Typography>
        }
        action={<StatusBadge status={report.status as Status} />}
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: "grey.50",
          borderBottom: "1px solid",
          borderColor: "divider",
          "& .MuiCardHeader-action": { mt: 0.375, mr: 0 },
          "& .MuiCardHeader-content": { minWidth: 0 },
        }}
      />

      {/* Detail rows */}
      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 }, flex: 1 }}>
        <Stack spacing={0}>
          {report.details.map((detail, i) => (
            <DetailRow key={i} detail={detail} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
