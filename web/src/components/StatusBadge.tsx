import Chip, { ChipProps } from "@mui/material/Chip";
import { Status } from "@/types";

const chipColor: Record<Status, ChipProps["color"]> = {
  UP:      "success",
  UP_W:    "warning",
  DOWN:    "error",
  HEADER:  "info",
  INFO:    "default",
  UNKNOWN: "default",
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
}

export default function StatusBadge({ status }: Props) {
  return (
    <Chip
      label={labels[status] ?? "N/A"}
      color={chipColor[status] ?? "default"}
      size="small"
      sx={{
        fontWeight: 800,
        fontSize: "0.58rem",
        height: 20,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}
