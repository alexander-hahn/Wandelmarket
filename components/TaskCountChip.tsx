"use client";

import Chip from "@mui/material/Chip";

interface CountChipProps {
  count: number;
}

export default function CountChip({ count }: CountChipProps) {
  return (
    <Chip
      label={count}
      size="small"
      sx={{
        height: 20,
        minWidth: 24,
        "& .MuiChip-label": {
          px: 0.5,
          fontSize: "0.75rem",
          fontWeight: 600,
        },
      }}
    />
  );
}
