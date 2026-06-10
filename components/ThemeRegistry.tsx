"use client";

import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { createNovaMuiTheme } from "@wandelbots/wandelbots-js-react-components/core";

const theme = createNovaMuiTheme({ palette: { mode: "dark" } });
theme.shape.borderRadius = 10;

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Apply Paper elevation-5 overlay to the body background (same white overlay MUI uses internally) */}
        <GlobalStyles
          styles={{
            "html, body": {
              backgroundColor: theme.palette.background.default,
              backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.10))",
              backgroundAttachment: "fixed",
            },
          }}
        />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
