"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  listActionIconButtonSx,
  listTableContainerSx,
  listTableHeadCellSx,
  listTableHeadSx,
  listTableRowSx,
} from "@/lib/listTheme";
import AsyncStateBlock from "@/components/AsyncStateBlock";
import { getListingSourceChip, getModerationStatusChip } from "@/lib/chipPresets";

interface ListingRow {
  id: string;
  name: string;
  category: string;
  author: string;
  status: "pending" | "approved" | "rejected";
  source: "submission" | "published";
  deletionRequestStatus?: "pending" | "approved" | "rejected" | null;
  createdAt: string;
}

export default function UserListingsPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingDeleteId, setRequestingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/user/listings", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          const message = (data as { error?: string } | null)?.error || "Failed to load listings";
          throw new Error(message);
        }
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : "Failed to load listings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const requestDeletion = async (itemId: string) => {
    setRequestingDeleteId(itemId);
    try {
      const res = await fetch(`/api/user/listings/${itemId}/delete-request`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as { error?: string } | null)?.error || "Failed to request deletion");

      setRows((prev) =>
        prev.map((row) =>
          row.id === itemId
            ? { ...row, deletionRequestStatus: "pending" }
            : row
        )
      );
    } finally {
      setRequestingDeleteId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" fontWeight={700}>My Listings</Typography>
        <Typography variant="body2" color="text.secondary">
          Listings you submitted and listings published under your author identity.
        </Typography>
      </Box>

      <AsyncStateBlock
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No listings submitted yet."
      >
        <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
          <Table size="small">
            <TableHead sx={listTableHeadSx}>
              <TableRow>
                <TableCell sx={listTableHeadCellSx}>Actions</TableCell>
                <TableCell sx={listTableHeadCellSx}>Name</TableCell>
                <TableCell sx={listTableHeadCellSx}>Category</TableCell>
                <TableCell sx={listTableHeadCellSx}>Source</TableCell>
                <TableCell sx={listTableHeadCellSx}>Status</TableCell>
                <TableCell sx={listTableHeadCellSx}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover sx={listTableRowSx}>
                  <TableCell>
                    <Stack direction="column" spacing={0.75} alignItems="flex-start">
                      <Tooltip title="Edit Listing">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => router.push(`/listings/new?edit=${row.id}`)}
                            sx={listActionIconButtonSx}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {row.source === "published" ? (
                        row.deletionRequestStatus === "pending" ? (
                          <Chip size="small" variant="outlined" label="Deletion Requested" color="warning" />
                        ) : (
                          <Tooltip title={requestingDeleteId === row.id ? "Requesting..." : "Request Deletion"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => requestDeletion(row.id)}
                                disabled={requestingDeleteId === row.id}
                                sx={listActionIconButtonSx}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>
                    {(() => {
                      const sourceChip = getListingSourceChip(row.source);
                      return (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={sourceChip.label}
                      color={sourceChip.color}
                    />
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const statusChip = getModerationStatusChip(row.status);
                      return (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={statusChip.label}
                      color={statusChip.color}
                    />
                      );
                    })()}
                  </TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AsyncStateBlock>
    </Stack>
  );
}
