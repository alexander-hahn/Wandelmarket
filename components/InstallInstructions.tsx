"use client";

import ReactMarkdown from "react-markdown";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h5" fontWeight={600} gutterBottom mt={2}>{children}</Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h6" fontWeight={600} gutterBottom mt={2}>{children}</Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle1" fontWeight={600} gutterBottom mt={1.5}>{children}</Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body2" paragraph>{children}</Typography>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body2" sx={{ ml: 2, mb: 0.5 }}>{children}</Typography>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <Box
          component="pre"
          sx={{
            backgroundColor: "action.hover",
            borderRadius: 1,
            p: 2,
            overflowX: "auto",
            my: 1.5,
            fontSize: "0.82rem",
            fontFamily: "monospace",
          }}
        >
          <code>{children}</code>
        </Box>
      );
    }
    return (
      <Box
        component="code"
        sx={{
          backgroundColor: "action.hover",
          borderRadius: 0.5,
          px: 0.75,
          py: 0.25,
          fontSize: "0.82rem",
          fontFamily: "monospace",
        }}
      >
        {children}
      </Box>
    );
  },
};

export default function InstallInstructions({ markdown }: { markdown: string }) {
  return <ReactMarkdown components={components}>{markdown}</ReactMarkdown>;
}
