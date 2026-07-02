"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { CATEGORY_LABELS } from "@/lib/categories";

interface BountyApprovalTask {
  id: string;
  bountyId: string;
  itemId: string;
  collectorId: string;
  status: string;
  createdAt: string;
  bountyTitle?: string;
  itemName?: string;
  itemDetails?: string;
  taskType?: string;
}

interface BountyPublishingTask {
  id: string;
  bountyId: string;
  approvalTaskId: string;
  itemId: string;
  status: string;
  createdAt: string;
  bountyTitle?: string;
  itemName?: string;
}

type Task = BountyApprovalTask | BountyPublishingTask;

function isBountyApprovalTask(task: Task): task is BountyApprovalTask {
  return "collectorId" in task;
}

export default function UserTasksPanel({ userRole }: { userRole?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load approval tasks for bounty requesters and publishing tasks for admins
      const tasksData: Task[] = [];

      // Always load approval tasks
      try {
        const approvalRes = await fetch("/api/bounty-approvals/my-tasks", {
          cache: "no-store",
          credentials: "include",
        });
        if (approvalRes.ok) {
          const approvalData = (await approvalRes.json()) as BountyApprovalTask[];
          tasksData.push(...approvalData);
        }
      } catch {
        // Ignore if endpoint doesn't exist yet
      }

      // Load publishing tasks for admins/moderators
      if (userRole === "admin" || userRole === "moderator") {
        try {
          const publishingRes = await fetch("/api/bounty-publishing/my-tasks", {
            cache: "no-store",
            credentials: "include",
          });
          if (publishingRes.ok) {
            const publishingData = (await publishingRes.json()) as BountyPublishingTask[];
            tasksData.push(...publishingData);
          }
        } catch {
          // Ignore if endpoint doesn't exist yet
        }
      }

      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleApprove = async (taskId: string) => {
    setProcessingTaskId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/bounty-approvals/${taskId}/approve`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve task");
      }

      setSuccessMessage("Task approved! Publishing task created for admins.");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve task");
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleReject = async (taskId: string) => {
    setProcessingTaskId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/bounty-approvals/${taskId}/reject`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reject task");
      }

      setSuccessMessage("Task rejected. Bounty reopened for new submissions.");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject task");
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handlePublish = async (taskId: string) => {
    setProcessingTaskId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/bounty-publishing/${taskId}/publish`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish task");
      }

      setSuccessMessage("Item published! Bounty marked as collected.");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish task");
    } finally {
      setProcessingTaskId(null);
    }
  };

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress size={32} />
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={700}>
          My Tasks
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pendingTasks.length} pending task{pendingTasks.length !== 1 ? "s" : ""}
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {pendingTasks.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">No pending tasks</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {pendingTasks.map((task) => (
            <Card key={task.id} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={0.5} sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBountyApprovalTask(task)
                            ? "Review Bounty Submission"
                            : "Publish Bounty Item"}
                        </Typography>
                        <Chip
                          label={isBountyApprovalTask(task) ? "APPROVAL NEEDED" : "PUBLISH READY"}
                          size="small"
                          variant="outlined"
                          color={isBountyApprovalTask(task) ? "warning" : "success"}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Bounty: {task.bountyTitle || "Unknown"}
                      </Typography>
                      <Typography variant="body2">
                        Item: <strong>{task.itemName || "Unknown"}</strong>
                      </Typography>
                      {isBountyApprovalTask(task) && task.itemDetails && (
                        <Typography variant="caption" color="text.secondary">
                          {task.itemDetails}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Created {new Date(task.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                  </Stack>

                  {isBountyApprovalTask(task) ? (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => void handleReject(task.id)}
                        disabled={processingTaskId === task.id}
                      >
                        {processingTaskId === task.id ? "Processing..." : "Reject"}
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => void handleApprove(task.id)}
                        disabled={processingTaskId === task.id}
                      >
                        {processingTaskId === task.id ? "Processing..." : "Approve"}
                      </Button>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => void handlePublish(task.id)}
                        disabled={processingTaskId === task.id}
                      >
                        {processingTaskId === task.id ? "Publishing..." : "Publish"}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
