"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface ListingComment {
  id: string;
  userId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export default function ListingDiscussion({
  itemId,
  currentUserId: initialCurrentUserId,
  initialComments,
}: {
  itemId: string;
  currentUserId?: string | null;
  initialComments: ListingComment[];
}) {
  const [comments, setComments] = useState<ListingComment[]>(initialComments);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialCurrentUserId ?? null);
  const [error, setError] = useState<string | null>(null);

  const hasMessage = useMemo(() => message.trim().length > 0, [message]);

  const handleSubmit = async () => {
    if (!hasMessage || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | ListingComment
        | null;

      if (!res.ok || !data || !("id" in data)) {
        throw new Error(
          (data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : null) || "Failed to post comment"
        );
      }

      setComments((prev) => [data, ...prev]);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (initialCurrentUserId) return;

    let cancelled = false;

    const loadCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;

        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (!cancelled && data?.id) {
          setCurrentUserId(data.id);
        }
      } catch {
        // Ignore; delete controls stay hidden.
      }
    };

    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [initialCurrentUserId]);

  const handleDelete = async (commentId: string) => {
    if (deletingId) return;

    setDeletingId(commentId);
    setError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/comments/${commentId}`, {
        method: "DELETE",
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete comment");
      }

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.25}>
        <Typography variant="h6" fontWeight={700}>
          Comments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Avatar sx={{ width: 32, height: 32, bgcolor: "warning.dark", fontSize: 12 }}>
          You
        </Avatar>
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <TextField
            multiline
            minRows={2}
            maxRows={8}
            placeholder="Add a public comment..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            variant="standard"
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="text" onClick={() => setMessage("")} disabled={!message || saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={!hasMessage || saving}>
              {saving ? "Posting..." : "Comment"}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      <Divider />

      {comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No comments yet. Be the first to share detailed feedback.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {comments.map((comment) => {
            const avatarLabel = comment.authorName.trim().charAt(0).toUpperCase() || "?";

            return (
              <Stack key={comment.id} direction="row" spacing={1.25} alignItems="flex-start">
                <Avatar sx={{ width: 32, height: 32, bgcolor: "action.selected", color: "text.primary", fontSize: 13 }}>
                  {avatarLabel}
                </Avatar>
                <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="baseline" flexWrap="wrap">
                    <Stack direction="row" spacing={0.75} alignItems="baseline" flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {comment.authorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(comment.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    {currentUserId && comment.userId === currentUserId && (
                      <IconButton
                        aria-label="Delete comment"
                        size="small"
                        onClick={() => void handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        sx={{ ml: "auto", color: "text.secondary" }}
                      >
                        {deletingId === comment.id ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <DeleteOutlineIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {comment.message}
                  </Typography>
                  <Box>
                    <Button size="small" variant="text" color="inherit" sx={{ minWidth: 0, px: 0, textTransform: "none", color: "text.secondary" }}>
                      Reply
                    </Button>
                  </Box>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
