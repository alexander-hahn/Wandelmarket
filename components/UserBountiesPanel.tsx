"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
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
import { CATEGORY_LABELS } from "@/lib/categories";
import {
  listActionIconButtonSx,
  listTableContainerSx,
  listTableHeadCellSx,
  listTableHeadSx,
  listTableRowSx,
} from "@/lib/listTheme";
import AsyncStateBlock from "@/components/AsyncStateBlock";
import { getBountyStatusChip } from "@/lib/chipPresets";

interface BountyRow {
  id: string;
  title: string;
  requestedCategory: string;
  bountyStars: number;
  status: "open" | "pending" | "collected" | "deleted";
  convertedItemId: string | null;
  createdAt: string;
}

export default function UserBountiesPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<BountyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingBountyId, setDeletingBountyId] = useState<string | null>(null);

  const activeRows = rows.filter((row) => row.status === "open" || row.status === "pending");
  const historyRows = rows.filter((row) => row.status === "collected" || row.status === "deleted");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/user/bounties", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error((data as { error?: string } | null)?.error || "Failed to load bounties");
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : "Failed to load bounties");
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

  const handleDeleteBounty = async (bountyId: string) => {
    setDeletingBountyId(bountyId);
    setError(null);

    try {
      const res = await fetch(`/api/user/bounties/${bountyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string } | null)?.error || "Failed to delete bounty");
      }

      setRows((prev) => prev.map((row) => (row.id === bountyId ? { ...row, status: "deleted", convertedItemId: null } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bounty");
    } finally {
      setDeletingBountyId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography variant="h6" fontWeight={700}>My Bounties</Typography>
        <Typography variant="body2" color="text.secondary">
          Bounties you requested in the marketplace.
        </Typography>
      </Stack>

      <AsyncStateBlock
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No bounties created yet."
      >
        <>
          <Box>
            <Typography variant="h6" fontWeight={700}>Active Bounties</Typography>
          </Box>
          {activeRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No open or pending bounties.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
              <Table size="small">
                <TableHead sx={listTableHeadSx}>
                  <TableRow>
                    <TableCell sx={listTableHeadCellSx}>Actions</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Title</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Category</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Stars</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Status</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeRows.map((row) => (
                    <TableRow key={row.id} hover sx={listTableRowSx}>
                      <TableCell>
                        <Stack direction="column" spacing={0.75} alignItems="flex-start">
                          <Tooltip title="Edit Bounty">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => router.push(`/bounties?section=create-bounty&edit=${row.id}`)}
                                sx={listActionIconButtonSx}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={deletingBountyId === row.id ? "Deleting..." : "Delete Bounty"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteBounty(row.id)}
                                disabled={deletingBountyId === row.id}
                                sx={listActionIconButtonSx}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{CATEGORY_LABELS[row.requestedCategory] ?? row.requestedCategory}</TableCell>
                      <TableCell>{row.bountyStars}</TableCell>
                      <TableCell>
                        {(() => {
                          const statusChip = getBountyStatusChip(row.status);
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
          )}

          <Box>
            <Typography variant="h6" fontWeight={700}>Bounty History</Typography>
          </Box>
          {historyRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No collected and approved bounties yet.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
              <Table size="small">
                <TableHead sx={listTableHeadSx}>
                  <TableRow>
                    <TableCell sx={listTableHeadCellSx}>Title</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Category</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Stars</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Listing</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Status</TableCell>
                    <TableCell sx={listTableHeadCellSx}>Collected</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyRows.map((row) => (
                    <TableRow key={row.id} hover sx={listTableRowSx}>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{CATEGORY_LABELS[row.requestedCategory] ?? row.requestedCategory}</TableCell>
                      <TableCell>{row.bountyStars}</TableCell>
                      <TableCell>
                        {row.convertedItemId ? (
                          <Button
                            size="small"
                            variant="outlined"
                            component={Link}
                            href={`/item/${row.convertedItemId}`}
                          >
                            Open Listing
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const statusChip = getBountyStatusChip(row.status);
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
          )}
        </>
      </AsyncStateBlock>
    </Stack>
  );
}
