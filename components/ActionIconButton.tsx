"use client";

import CircularProgress from "@mui/material/CircularProgress";
import IconButton, { type IconButtonProps } from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { TooltipProps } from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";

interface ActionIconButtonProps {
  title: string;
  loading?: boolean;
  followCursor?: boolean;
  placement?: TooltipProps["placement"];
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  iconButtonProps?: Omit<IconButtonProps, "children" | "sx">;
}

export default function ActionIconButton({
  title,
  loading = false,
  followCursor = false,
  placement,
  sx,
  children,
  iconButtonProps,
}: ActionIconButtonProps) {
  return (
    <Tooltip title={title} followCursor={followCursor} placement={placement}>
      <span>
        <IconButton
          size="small"
          {...iconButtonProps}
          sx={{
            width: 40,
            height: 40,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            ...sx,
          }}
        >
          {loading ? <CircularProgress size={16} /> : children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
