import type { SxProps, Theme } from "@mui/material/styles";

export const listSectionPaperSx: SxProps<Theme> = {
  p: 3,
  borderRadius: 2,
};

export const listTableContainerSx: SxProps<Theme> = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  overflowX: "auto",
  overflowY: "hidden",
};

export const listTableHeadSx: SxProps<Theme> = {
  backgroundColor: "action.hover",
  "& .MuiTableCell-root": {
    fontWeight: 700,
    color: "text.primary",
    py: 1,
  },
};

export const listTableHeadCellSx: SxProps<Theme> = {
  fontWeight: 700,
  color: "text.primary",
  py: 1,
};

export const listTableRowSx: SxProps<Theme> = {
  "&:last-child td": { borderBottom: 0 },
};

export const listActionIconButtonSx: SxProps<Theme> = {
  width: 32,
  height: 32,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
};
