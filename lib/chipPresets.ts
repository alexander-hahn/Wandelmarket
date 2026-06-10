import type { ChipProps } from "@mui/material/Chip";

type ChipPreset = {
  label: string;
  color: ChipProps["color"];
};

export function getListingSourceChip(source: "submission" | "published"): ChipPreset {
  return source === "published"
    ? { label: "Published", color: "success" }
    : { label: "Submission", color: "default" };
}

export function getModerationStatusChip(status: "pending" | "approved" | "rejected"): ChipPreset {
  if (status === "approved") return { label: status, color: "success" };
  if (status === "pending") return { label: status, color: "warning" };
  return { label: status, color: "default" };
}

export function getBountyStatusChip(status: string): ChipPreset {
  if (status === "collected") return { label: status, color: "success" };
  if (status === "pending") return { label: status, color: "warning" };
  return { label: status, color: "default" };
}

export function getTeamStatusChip(status: string): ChipPreset {
  if (status === "approved") return { label: status, color: "success" };
  if (status === "pending") return { label: status, color: "warning" };
  return { label: status, color: "default" };
}

export function getTeamRoleChip(role: string): ChipPreset {
  if (role === "leader") return { label: role, color: "info" };
  return { label: role, color: "default" };
}

export function getItemSourceChip(source: string): ChipPreset {
  if (source === "github") return { label: source, color: "success" };
  if (source === "manual") return { label: source, color: "info" };
  return { label: source, color: "default" };
}

export function getVisibilityChip(visibility: string): ChipPreset {
  if (visibility === "teams") return { label: "Teams", color: "info" };
  return { label: "Members", color: "default" };
}

export function getTaskTypeChip(taskType: string): ChipPreset {
  if (taskType === "bounty") return { label: "Bounty", color: "warning" };
  if (taskType === "user") return { label: "User Role", color: "info" };
  if (taskType === "listing") return { label: "Listing", color: "success" };
  if (taskType === "listing-delete") return { label: "Listing Delete", color: "error" };
  return { label: "Team", color: "secondary" };
}
