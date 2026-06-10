"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const HOLD_TO_TRANSFER_MS = 3000;

export interface TeamOwnershipMember {
  userId: string;
  role: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface TeamOwnershipTransferDialogProps {
  open: boolean;
  members: TeamOwnershipMember[];
  loadingMembers?: boolean;
  targetUserId: string;
  reason: string;
  loadingConfirm?: boolean;
  onTargetUserIdChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function getMemberLabel(member: TeamOwnershipMember): string {
  return (
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    member.displayName ||
    member.email ||
    member.userId
  );
}

export default function TeamOwnershipTransferDialog({
  open,
  members,
  loadingMembers = false,
  targetUserId,
  reason,
  loadingConfirm = false,
  onTargetUserIdChange,
  onReasonChange,
  onClose,
  onConfirm,
}: TeamOwnershipTransferDialogProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHoldTimers = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const resetHoldState = () => {
    clearHoldTimers();
    setIsHolding(false);
    setHoldProgress(0);
  };

  const startHold = () => {
    if (!targetUserId || loadingConfirm) return;

    resetHoldState();
    setIsHolding(true);

    const startedAt = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setHoldProgress(Math.min(1, elapsed / HOLD_TO_TRANSFER_MS));
    }, 50);

    holdTimeoutRef.current = setTimeout(() => {
      clearHoldTimers();
      setIsHolding(false);
      onConfirm();
    }, HOLD_TO_TRANSFER_MS);
  };

  const cancelHold = () => {
    if (loadingConfirm) return;
    resetHoldState();
  };

  useEffect(() => {
    if (!open) {
      resetHoldState();
    }
  }, [open]);

  useEffect(() => {
    if (!loadingConfirm) return;
    resetHoldState();
  }, [loadingConfirm]);

  useEffect(() => {
    return () => {
      clearHoldTimers();
    };
  }, []);

  const ownerCandidates = members.filter((member) => member.role !== "leader");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Team Ownership</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Alert severity="warning" variant="outlined">
            This will transfer leadership to another member. Hold the transfer button for 3 seconds to confirm.
          </Alert>

          {loadingMembers ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Loading members...
              </Typography>
            </Stack>
          ) : (
            <>
              <TextField
                select
                label="New Owner"
                value={targetUserId}
                onChange={(event) => onTargetUserIdChange(event.target.value)}
                fullWidth
              >
                {ownerCandidates.map((member) => (
                  <MenuItem key={member.userId} value={member.userId}>
                    {getMemberLabel(member)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Reason (optional)"
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                fullWidth
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="warning"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          disabled={loadingConfirm || !targetUserId || loadingMembers}
          sx={{
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              width: `${Math.round(holdProgress * 100)}%`,
              bgcolor: "warning.main",
              opacity: 0.2,
              transition: isHolding ? "none" : "width 120ms ease",
            },
          }}
        >
          {loadingConfirm
            ? "Transferring..."
            : isHolding
            ? `Hold... ${Math.max(0, Math.ceil(3 - 3 * holdProgress))}s`
            : "Hold 3s to Transfer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
