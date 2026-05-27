import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import { DashboardData } from "@/types";

interface StatCardProps {
  label: string;
  value: number;
  textColor: string;
  borderAccent?: string;
  icon: ReactNode;
}

function StatCard({ label, value, textColor, borderAccent, icon }: StatCardProps) {
  return (
    <Paper
      sx={{
        p: { xs: 2, md: 2.5 },
        height: "100%",
        borderLeft: borderAccent ? `4px solid ${borderAccent}` : undefined,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              display: "block",
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontWeight: 900, lineHeight: 1.1, mt: 0.75, color: textColor }}
          >
            {value}
          </Typography>
        </Box>
        <Box sx={{ color: textColor, opacity: 0.35, mt: 0.25 }}>
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

export default function StatsGrid({ data }: { data: DashboardData }) {
  const total =
    data.results?.reduce((acc, r) => acc + r.details.length, 0) ?? 0;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Total Checks"
          value={total}
          textColor="inherit"
          icon={<AssessmentRoundedIcon sx={{ fontSize: 36 }} />}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Operational"
          value={data.upCount ?? 0}
          textColor="#2e7d32"
          icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: 36 }} />}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Warnings"
          value={data.warningCount ?? 0}
          textColor="#ed6c02"
          borderAccent="#ed6c02"
          icon={<WarningAmberRoundedIcon sx={{ fontSize: 36 }} />}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          label="Critical Issues"
          value={data.downCount ?? 0}
          textColor="#c62828"
          borderAccent="#c62828"
          icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 36 }} />}
        />
      </Grid>
    </Grid>
  );
}
