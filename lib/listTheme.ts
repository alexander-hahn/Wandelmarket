import type { SystemStyleObject, Theme } from "@mui/material/styles";

export const listSectionPaperSx: SystemStyleObject<Theme> = {
  p: 3,
  borderRadius: 2,
};

export const listTableContainerSx: SystemStyleObject<Theme> = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  overflowX: "auto",
  overflowY: "hidden",
};

export const listTableHeadSx: SystemStyleObject<Theme> = {
  backgroundColor: "action.hover",
  "& .MuiTableCell-root": {
    fontWeight: 700,
    color: "text.primary",
    py: 1,
  },
};

export const listTableHeadCellSx: SystemStyleObject<Theme> = {
  fontWeight: 700,
  color: "text.primary",
  py: 1,
};

export const listTableRowSx: SystemStyleObject<Theme> = {
  "&:last-child td": { borderBottom: 0 },
};

export const listActionIconButtonSx: SystemStyleObject<Theme> = {
  width: 32,
  height: 32,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
};
