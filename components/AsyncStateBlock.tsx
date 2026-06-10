"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

interface AsyncStateBlockProps {
  loading: boolean;
  error?: string | null;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}

export default function AsyncStateBlock({
  loading,
  error,
  isEmpty,
  emptyMessage,
  children,
}: AsyncStateBlockProps) {
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (isEmpty) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return <>{children}</>;
}
