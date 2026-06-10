"use client";

import { useEffect, useMemo, useState } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import CircularProgress from "@mui/material/CircularProgress";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TeamOwnershipTransferDialog from "@/components/TeamOwnershipTransferDialog";
import ActionIconButton from "@/components/ActionIconButton";
import { getTeamRoleChip, getTeamStatusChip } from "@/lib/chipPresets";
import { listTableContainerSx } from "@/lib/listTheme";

interface TeamRecord {
  id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
}

interface TeamMemberRecord {
  userId: string;
  role: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export default function UserTeamsPanel() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [addingForTeamId, setAddingForTeamId] = useState<string | null>(null);
  const [transferringTeamId, setTransferringTeamId] = useState<string | null>(null);
  const [teamMembersByTeamId, setTeamMembersByTeamId] = useState<Record<string, TeamMemberRecord[]>>({});
  const [loadingMembersForTeamId, setLoadingMembersForTeamId] = useState<string | null>(null);
  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    teamId: string | null;
    targetUserId: string;
    reason: string;
  }>({
    open: false,
    teamId: null,
    targetUserId: "",
    reason: "",
  });
  const [newMemberEmailByTeam, setNewMemberEmailByTeam] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTeams = async () => {
    const res = await fetch("/api/teams/me", { cache: "no-store" });
    const data = await res.json().catch(() => []);
    setTeams(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const leaderTeams = useMemo(
    () => teams.filter((team) => team.role === "leader" && team.status === "approved"),
    [teams]
  );

  const loadTeamMembers = async (teamId: string) => {
    if (teamMembersByTeamId[teamId]) return teamMembersByTeamId[teamId];

    setLoadingMembersForTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, { cache: "no-store" });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || "Failed to load team members");

      const members = Array.isArray(data) ? (data as TeamMemberRecord[]) : [];
      setTeamMembersByTeamId((prev) => ({ ...prev, [teamId]: members }));
      return members;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members");
      setTeamMembersByTeamId((prev) => ({ ...prev, [teamId]: [] }));
      return [];
    } finally {
      setLoadingMembersForTeamId(null);
    }
  };

  useEffect(() => {
    for (const team of leaderTeams) {
      if (!teamMembersByTeamId[team.id]) {
        void loadTeamMembers(team.id);
      }
    }
  }, [leaderTeams, teamMembersByTeamId]);

  const handleCreateTeam = async () => {
    setCreatingTeam(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to create team request");

      setTeamName("");
      setSuccess("Team request submitted. An admin must approve it before it becomes active.");
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team request");
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleAddMember = async (teamId: string) => {
    const userEmail = (newMemberEmailByTeam[teamId] || "").trim();
    if (!userEmail) return;

    setAddingForTeamId(teamId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to add member");

      setNewMemberEmailByTeam((prev) => ({ ...prev, [teamId]: "" }));
      setSuccess("Team member added.");
      setTeamMembersByTeamId((prev) => {
        const copy = { ...prev };
        delete copy[teamId];
        return copy;
      });
      await loadTeamMembers(teamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingForTeamId(null);
    }
  };

  const handleTransferOwnership = async () => {
    const teamId = transferDialog.teamId;
    if (!teamId || !transferDialog.targetUserId) {
      setError("Select a new owner first.");
      return;
    }

    setTransferringTeamId(teamId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/teams/${teamId}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: transferDialog.targetUserId,
          holdConfirmed: true,
          reason: transferDialog.reason,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to transfer ownership");

      setSuccess("Team ownership transferred.");
      setTransferDialog({ open: false, teamId: null, targetUserId: "", reason: "" });
      setTeamMembersByTeamId((prev) => {
        const copy = { ...prev };
        delete copy[teamId];
        return copy;
      });
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setTransferringTeamId(null);
    }
  };

  const openTransferDialog = async (teamId: string) => {
    const members = await loadTeamMembers(teamId);
    const firstCandidate = members.find((member) => member.role !== "leader")?.userId ?? "";

    setTransferDialog({
      open: true,
      teamId,
      targetUserId: firstCandidate,
      reason: "",
    });
  };

  return (
    <Stack spacing={2}>
        <Typography variant="h6" fontWeight={700}>
          Teams
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            fullWidth
            label="Create New Team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            helperText="Creates a team request for admin approval. You become the team leader."
          />
          <Button
            variant="contained"
            onClick={handleCreateTeam}
            disabled={creatingTeam || !teamName.trim()}
            sx={{
              height: { xs: 40, sm: 56 },
              minWidth: { sm: 150 },
              whiteSpace: "nowrap",
            }}
          >
            {creatingTeam ? "Submitting..." : "Request Team"}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {teams.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              You are not assigned to any teams yet.
            </Typography>
          )}
          {teams.map((team) => (
            (() => {
              const teamStatusChip = getTeamStatusChip(team.status);
              return (
            <Chip
              key={team.id}
              label={`${team.name} (${team.role}${team.status !== "approved" ? `, ${team.status}` : ""})`}
              variant="outlined"
              color={teamStatusChip.color}
            />
              );
            })()
          ))}
        </Stack>

        {leaderTeams.map((team) => (
          <Paper
            key={team.id}
            variant="outlined"
            sx={[listTableContainerSx, { p: 1.5, borderRadius: "10px" }]}
          >
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" fontWeight={700}>
                {team.name}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <TextField
                  fullWidth
                  size="small"
                  label="Enter user email to add member"
                  value={newMemberEmailByTeam[team.id] || ""}
                  onChange={(e) =>
                    setNewMemberEmailByTeam((prev) => ({ ...prev, [team.id]: e.target.value }))
                  }
                />
                <ActionIconButton
                  title={addingForTeamId === team.id ? "Adding..." : "Add Member"}
                  loading={addingForTeamId === team.id}
                  iconButtonProps={{
                    color: "primary",
                    onClick: () => handleAddMember(team.id),
                    disabled: addingForTeamId === team.id || !(newMemberEmailByTeam[team.id] || "").trim(),
                  }}
                  sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                >
                  <PersonAddIcon fontSize="small" />
                </ActionIconButton>
              </Stack>

              <Accordion
                disableGutters
                sx={[listTableContainerSx, { borderRadius: 1, "&:before": { display: "none" } }]}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    Team Members ({(teamMembersByTeamId[team.id] ?? []).length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {loadingMembersForTeamId === team.id ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Loading members...
                      </Typography>
                    </Stack>
                  ) : (teamMembersByTeamId[team.id] ?? []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No members found.
                    </Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {(teamMembersByTeamId[team.id] ?? []).map((member) => {
                        const roleChip = getTeamRoleChip(member.role);
                        const label =
                          [member.firstName, member.lastName].filter(Boolean).join(" ") ||
                          member.displayName ||
                          member.email ||
                          member.userId;

                        return (
                          <Stack
                            key={`${team.id}-${member.userId}`}
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                              py: 0.5,
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              "&:last-of-type": { borderBottom: "none" },
                            }}
                          >
                            <Typography variant="body2">{label}</Typography>
                            <Chip size="small" variant="outlined" label={roleChip.label} color={roleChip.color} />
                          </Stack>
                        );
                      })}
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>

              <Stack spacing={1}>
                <ActionIconButton
                  title="Transfer Ownership"
                  loading={loadingMembersForTeamId === team.id}
                  followCursor
                  placement="top"
                  iconButtonProps={{
                    color: "info",
                    onClick: () => void openTransferDialog(team.id),
                    disabled: transferringTeamId === team.id || loadingMembersForTeamId === team.id,
                  }}
                  sx={{ alignSelf: "flex-start" }}
                >
                  <CompareArrowsIcon fontSize="small" />
                </ActionIconButton>
              </Stack>
            </Stack>
          </Paper>
        ))}

      <TeamOwnershipTransferDialog
        open={transferDialog.open}
        members={teamMembersByTeamId[transferDialog.teamId ?? ""] ?? []}
        loadingMembers={loadingMembersForTeamId === transferDialog.teamId}
        targetUserId={transferDialog.targetUserId}
        reason={transferDialog.reason}
        loadingConfirm={transferringTeamId === transferDialog.teamId}
        onTargetUserIdChange={(value) =>
          setTransferDialog((prev) => ({
            ...prev,
            targetUserId: value,
          }))
        }
        onReasonChange={(value) =>
          setTransferDialog((prev) => ({
            ...prev,
            reason: value,
          }))
        }
        onClose={() => setTransferDialog({ open: false, teamId: null, targetUserId: "", reason: "" })}
        onConfirm={() => {
          void handleTransferOwnership();
        }}
      />
    </Stack>
  );
}
