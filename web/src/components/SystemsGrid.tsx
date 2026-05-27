import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { SystemReport } from "@/types";
import SystemCard from "./SystemCard";

export default function SystemsGrid({ results }: { results: SystemReport[] }) {
  const grouped = results.reduce<Record<string, SystemReport[]>>((acc, report) => {
    const cat = report.category || "General";
    (acc[cat] ??= []).push(report);
    return acc;
  }, {});

  return (
    <Stack spacing={5}>
      {Object.entries(grouped).map(([category, reports]) => (
        <Box key={category}>
          {/* Category heading */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              mb: 2.5,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                whiteSpace: "nowrap",
              }}
            >
              {category}
            </Typography>
            <Divider sx={{ flex: 1 }} />
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ whiteSpace: "nowrap" }}
            >
              {reports.length} system{reports.length !== 1 ? "s" : ""}
            </Typography>
          </Box>

          {/* Cards grid */}
          <Grid container spacing={2.5}>
            {reports.map((report, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
                <SystemCard report={report} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Stack>
  );
}
