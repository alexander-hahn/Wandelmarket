"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import SyncIcon from "@mui/icons-material/Sync";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LinkIcon from "@mui/icons-material/Link";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TagInput from "@/components/TagInput";
import TeamOwnershipTransferDialog from "@/components/TeamOwnershipTransferDialog";
import ActionIconButton from "@/components/ActionIconButton";
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";
import {
  getBountyStatusChip,
  getItemSourceChip,
  getTaskTypeChip,
  getTeamRoleChip,
  getTeamStatusChip,
  getVisibilityChip,
} from "@/lib/chipPresets";
import {
  listActionIconButtonSx,
  listTableContainerSx,
  listTableHeadSx,
  listTableRowSx,
} from "@/lib/listTheme";
import type { ShopItem } from "@prisma/client";

type AdminItem = ShopItem & {
  teamIds?: string[];
  teamNames?: string[];
};

const CATEGORIES = CATEGORY_OPTIONS;

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "project",
  authorUserId: "",
  version: "",
  downloadUrl: "",
  repoUrl: "",
  websiteUrl: "",
  thumbnailUrl: "",
  tags: [] as string[],
  installInstructions: "",
  visibility: "members" as "members" | "teams",
  teamIds: [] as string[],
};

type FormState = typeof EMPTY_FORM;

const ALLOWED_EMAIL_DOMAIN = "@wandelbots.com";

interface BountyRequest {
  id: string;
  title: string;
  description: string;
  requester: string;
  requestedCategory: string;
  bountyStars: number;
  reward: string | null;
  status: string;
  convertedItemId: string | null;
  createdAt: string;
}

interface AppUserRecord {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: "member" | "moderator" | "admin";
  roleAssignmentRequired: boolean;
  teamIds?: string[];
  teamNames?: string[];
  createdAt: string;
  updatedAt: string;
}

interface TeamRecord {
  id: string;
  name: string;
  slug: string;
  status: "pending" | "approved" | "rejected";
  createdByUserId: string;
  leaderUserId: string;
  createdAt: string;
}

interface TeamMemberRecord {
  userId: string;
  role: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface ListingSubmission {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  submittedByUserId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface ListingDeletionRequest {
  id: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemAuthor: string;
  requestedByUserId: string;
  requestedByDisplayName: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  target: "wandelmarket" | "bounties";
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function isAllowedEmail(value: string) {
  return value.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function getUserAuthorLabel(user: AppUserRecord) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.displayName || fullName || user.email || user.id;
}

function normalizeIdentity(value: string) {
  return value.trim().toLowerCase();
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const raw = await res.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminItem[]>([]);
  const [bounties, setBounties] = useState<BountyRequest[]>([]);
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [listingSubmissions, setListingSubmissions] = useState<ListingSubmission[]>([]);
  const [listingDeletionRequests, setListingDeletionRequests] = useState<ListingDeletionRequest[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBounties, setLoadingBounties] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingListingSubmissions, setLoadingListingSubmissions] = useState(true);
  const [loadingListingDeletionRequests, setLoadingListingDeletionRequests] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [convertingBountyId, setConvertingBountyId] = useState<string | null>(null);
  const [abortingBountyId, setAbortingBountyId] = useState<string | null>(null);
  const [updatingItemTeamsId, setUpdatingItemTeamsId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [dismissingUserTaskId, setDismissingUserTaskId] = useState<string | null>(null);
  const [approvingSubmissionId, setApprovingSubmissionId] = useState<string | null>(null);
  const [rejectingSubmissionId, setRejectingSubmissionId] = useState<string | null>(null);
  const [approvingListingDeletionRequestId, setApprovingListingDeletionRequestId] = useState<string | null>(null);
  const [rejectingListingDeletionRequestId, setRejectingListingDeletionRequestId] = useState<string | null>(null);
  const [approvingTeamId, setApprovingTeamId] = useState<string | null>(null);
  const [rejectingTeamId, setRejectingTeamId] = useState<string | null>(null);
  const [teamMembersByTeamId, setTeamMembersByTeamId] = useState<Record<string, TeamMemberRecord[]>>({});
  const [loadingMembersForTeamId, setLoadingMembersForTeamId] = useState<string | null>(null);
  const [editingTeamById, setEditingTeamById] = useState<Record<string, { name: string }>>({});
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [teamMemberEmailByTeamId, setTeamMemberEmailByTeamId] = useState<Record<string, string>>({});
  const [addingTeamMemberForTeamId, setAddingTeamMemberForTeamId] = useState<string | null>(null);
  const [removingTeamMemberKey, setRemovingTeamMemberKey] = useState<string | null>(null);
  const [transferringTeamId, setTransferringTeamId] = useState<string | null>(null);
  const [ownershipTransferDialog, setOwnershipTransferDialog] = useState<{
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
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [registeringUser, setRegisteringUser] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceBountyId, setSourceBountyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [syncResults, setSyncResults] = useState<Array<{ provider: string; synced: number; error?: string }>>([]);
  const [activeTab, setActiveTab] = useState<"analytics" | "content" | "announcements" | "tasks" | "users" | "teams">("content");
  const [analyticsNowMs, setAnalyticsNowMs] = useState<number | null>(null);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [updatingAnnouncementId, setUpdatingAnnouncementId] = useState<string | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<{
    title: string;
    message: string;
    target: "wandelmarket" | "bounties";
    enabled: boolean;
  }>({
    title: "",
    message: "",
    target: "wandelmarket",
    enabled: true,
  });

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: "",
      message: "",
      target: "wandelmarket",
      enabled: true,
    });
    setEditingAnnouncementId(null);
  };

  useEffect(() => {
    const raw = searchParams.get("tab");
    const timeoutId = window.setTimeout(() => {
      if (raw === "analytics" || raw === "content" || raw === "announcements" || raw === "tasks" || raw === "users" || raw === "teams") {
        setActiveTab(raw);
      } else {
        setActiveTab("content");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAnalyticsNowMs(Date.now());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const setAdminTab = (tab: "analytics" | "content" | "announcements" | "tasks" | "users" | "teams") => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`);
  };

  const analytics = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const visibilityCounts: Record<string, number> = {};
    const bountyStatusCounts: Record<string, number> = {};
    const teamStatusCounts: Record<string, number> = {};
    const roleCounts: Record<string, number> = {};

    let withInstallInstructions = 0;
    let withThumbnail = 0;
    let recentlyUpdated = 0;
    let teamVisibleItems = 0;
    let totalTeamAssignments = 0;
    let manualItems = 0;

    const thirtyDaysAgo = (analyticsNowMs ?? 0) - 30 * 24 * 60 * 60 * 1000;

    for (const item of items) {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
      sourceCounts[item.source] = (sourceCounts[item.source] ?? 0) + 1;
      visibilityCounts[item.visibility ?? "members"] = (visibilityCounts[item.visibility ?? "members"] ?? 0) + 1;

      if (item.installInstructions) withInstallInstructions += 1;
      if (item.thumbnailOverride || item.thumbnailUrl) withThumbnail += 1;
      if (new Date(item.updatedAt).getTime() >= thirtyDaysAgo) recentlyUpdated += 1;
      if (item.source === "manual") manualItems += 1;
      if (item.visibility === "teams") teamVisibleItems += 1;
      if (Array.isArray(item.teamIds)) totalTeamAssignments += item.teamIds.length;
    }

    for (const bounty of bounties) {
      bountyStatusCounts[bounty.status] = (bountyStatusCounts[bounty.status] ?? 0) + 1;
    }

    for (const team of teams) {
      teamStatusCounts[team.status] = (teamStatusCounts[team.status] ?? 0) + 1;
    }

    for (const user of users) {
      roleCounts[user.role] = (roleCounts[user.role] ?? 0) + 1;
    }

    const topStarred = [...items]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 5)
      .filter((item) => item.stars > 0);

    const categoryBreakdown = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const sourceBreakdown = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
    const visibilityBreakdown = Object.entries(visibilityCounts).sort((a, b) => b[1] - a[1]);
    const bountyStatusBreakdown = Object.entries(bountyStatusCounts).sort((a, b) => b[1] - a[1]);
    const teamStatusBreakdown = Object.entries(teamStatusCounts).sort((a, b) => b[1] - a[1]);
    const roleBreakdown = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);

    const totalItems = items.length;
    const providerItems = Math.max(0, totalItems - manualItems);
    const pendingBountyTasks = bounties.filter((bounty) => bounty.status === "pending").length;
    const pendingTeamRequests = teams.filter((team) => team.status === "pending").length;
    const pendingDeletionRequests = listingDeletionRequests.filter((request) => request.status === "pending").length;
    const pendingRoleTasks = users.filter((user) => user.roleAssignmentRequired).length;
    const pendingListingSubmissions = listingSubmissions.length;
    const workflowBacklog =
      pendingBountyTasks +
      pendingTeamRequests +
      pendingDeletionRequests +
      pendingRoleTasks +
      pendingListingSubmissions;

    return {
      totalItems,
      withInstallInstructions,
      withThumbnail,
      recentlyUpdated,
      manualItems,
      providerItems,
      teamVisibleItems,
      totalTeamAssignments,
      workflowBacklog,
      pendingBountyTasks,
      pendingTeamRequests,
      pendingDeletionRequests,
      pendingRoleTasks,
      pendingListingSubmissions,
      categoryBreakdown,
      sourceBreakdown,
      visibilityBreakdown,
      bountyStatusBreakdown,
      teamStatusBreakdown,
      roleBreakdown,
      topStarred,
      installCoverage: totalItems === 0 ? 0 : Math.round((withInstallInstructions / totalItems) * 100),
      thumbnailCoverage: totalItems === 0 ? 0 : Math.round((withThumbnail / totalItems) * 100),
      teamVisibilityCoverage: totalItems === 0 ? 0 : Math.round((teamVisibleItems / totalItems) * 100),
    };
  }, [items, bounties, users, teams, listingSubmissions, listingDeletionRequests, analyticsNowMs]);

  const usersRequiringRoleAssignment = useMemo(
    () => users.filter((user) => user.roleAssignmentRequired),
    [users]
  );

  const approvedTeams = useMemo(() => teams.filter((team) => team.status === "approved"), [teams]);

  const authorOptions = useMemo(
    () => users.map((user) => ({ userId: user.id, label: getUserAuthorLabel(user) })),
    [users]
  );

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of users) {
      map.set(user.id, getUserAuthorLabel(user));
    }
    return map;
  }, [users]);

  const mixedTasks = useMemo(() => {
    const bountyTasks = bounties
      .filter((bounty) => bounty.status === "pending")
      .map((bounty) => ({
        id: bounty.id,
        type: "bounty" as const,
        title: bounty.title,
        subtitle: `Requester: ${bounty.requester}`,
        meta: CATEGORY_LABELS[bounty.requestedCategory] ?? bounty.requestedCategory,
        createdAt: bounty.createdAt,
        payload: bounty,
      }));

    const userTasks = usersRequiringRoleAssignment.map((user) => ({
      id: user.id,
      type: "user" as const,
      title: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown user",
      subtitle: user.email || "No email",
      meta: `Current role: ${user.role}`,
      createdAt: user.createdAt,
      payload: user,
    }));

    const listingTasks = listingSubmissions.map((submission) => ({
      id: submission.id,
      type: "listing" as const,
      title: submission.name,
      subtitle: `Author: ${submission.author}`,
      meta: CATEGORY_LABELS[submission.category] ?? submission.category,
      createdAt: submission.createdAt,
      payload: submission,
    }));

    const teamTasks = teams
      .filter((team) => team.status === "pending")
      .map((team) => ({
        id: team.id,
        type: "team" as const,
        title: team.name,
        subtitle: `Requested by: ${team.createdByUserId}`,
        meta: `Leader: ${team.leaderUserId}`,
        createdAt: team.createdAt,
        payload: team,
      }));

    const listingDeletionTasks = listingDeletionRequests
      .filter((request) => request.status === "pending")
      .map((request) => ({
        id: request.id,
        type: "listing-delete" as const,
        title: request.itemName,
        subtitle: `Author: ${request.itemAuthor}`,
        meta: `Requested by: ${request.requestedByDisplayName || request.requestedByUserId}`,
        createdAt: request.createdAt,
        payload: request,
      }));

    return [...bountyTasks, ...userTasks, ...listingTasks, ...teamTasks, ...listingDeletionTasks].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [bounties, usersRequiringRoleAssignment, listingSubmissions, teams, listingDeletionRequests]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/items");
    const data = await readJsonSafe<AdminItem[]>(res);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const loadBounties = useCallback(async () => {
    setLoadingBounties(true);
    try {
      const res = await fetch("/api/bounties", { cache: "no-store" });
      const data = await readJsonSafe<unknown>(res);
      setBounties(Array.isArray(data) ? data : []);
    } finally {
      setLoadingBounties(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await readJsonSafe<{ error?: string } | unknown[]>(res);
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load users", severity: "error" });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadListingSubmissions = useCallback(async () => {
    setLoadingListingSubmissions(true);
    try {
      const res = await fetch("/api/listing-submissions", { cache: "no-store" });
      const data = await readJsonSafe<{ error?: string } | unknown[]>(res);
      if (!res.ok) throw new Error(data.error || "Failed to load listing submissions");
      setListingSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to load listing submissions",
        severity: "error",
      });
      setListingSubmissions([]);
    } finally {
      setLoadingListingSubmissions(false);
    }
  }, []);

  const loadListingDeletionRequests = useCallback(async () => {
    setLoadingListingDeletionRequests(true);
    try {
      const res = await fetch("/api/listing-deletion-requests", { cache: "no-store" });
      const data = await readJsonSafe<{ error?: string } | unknown[]>(res);
      if (!res.ok) throw new Error((data as { error?: string } | null)?.error || "Failed to load listing deletion requests");
      setListingDeletionRequests(Array.isArray(data) ? (data as ListingDeletionRequest[]) : []);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to load listing deletion requests",
        severity: "error",
      });
      setListingDeletionRequests([]);
    } finally {
      setLoadingListingDeletionRequests(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch("/api/teams", { cache: "no-store" });
      const data = await readJsonSafe<{ error?: string } | unknown[]>(res);
      if (!res.ok) throw new Error(data.error || "Failed to load teams");
      setTeams(Array.isArray(data) ? (data as TeamRecord[]) : []);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load teams", severity: "error" });
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" });
      const data = await readJsonSafe<{ error?: string } | unknown[]>(res);
      if (!res.ok) throw new Error((data as { error?: string } | null)?.error || "Failed to load announcements");
      setAnnouncements(Array.isArray(data) ? (data as AnnouncementRecord[]) : []);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load announcements", severity: "error" });
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadItems();
      void loadBounties();
      void loadUsers();
      void loadListingSubmissions();
      void loadListingDeletionRequests();
      void loadTeams();
      void loadAnnouncements();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadItems, loadBounties, loadUsers, loadListingSubmissions, loadListingDeletionRequests, loadTeams, loadAnnouncements]);

  const handleSaveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      setToast({ message: "Title and message are required", severity: "error" });
      return;
    }

    if (editingAnnouncementId) {
      setUpdatingAnnouncementId(editingAnnouncementId);
    } else {
      setCreatingAnnouncement(true);
    }

    try {
      const res = await fetch(editingAnnouncementId ? `/api/announcements/${editingAnnouncementId}` : "/api/announcements", {
        method: editingAnnouncementId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: announcementForm.title,
          message: announcementForm.message,
          target: announcementForm.target,
          enabled: announcementForm.enabled,
        }),
      });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error || (editingAnnouncementId ? "Failed to update announcement" : "Failed to create announcement"));
      }

      resetAnnouncementForm();
      setToast({ message: editingAnnouncementId ? "Announcement updated" : "Announcement created", severity: "success" });
      await loadAnnouncements();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to save announcement", severity: "error" });
    } finally {
      setCreatingAnnouncement(false);
      setUpdatingAnnouncementId(null);
    }
  };

  const handleEditAnnouncement = (announcement: AnnouncementRecord) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementForm({
      title: announcement.title,
      message: announcement.message,
      target: announcement.target,
      enabled: announcement.enabled,
    });
  };

  const handleToggleAnnouncement = async (announcement: AnnouncementRecord) => {
    setUpdatingAnnouncementId(announcement.id);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !announcement.enabled }),
      });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to update announcement status");

      setToast({ message: `Announcement ${announcement.enabled ? "disabled" : "enabled"}`, severity: "success" });
      await loadAnnouncements();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to update announcement status", severity: "error" });
    } finally {
      setUpdatingAnnouncementId(null);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;

    setDeletingAnnouncementId(announcementId);
    try {
      const res = await fetch(`/api/announcements/${announcementId}`, { method: "DELETE" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to delete announcement");

      if (editingAnnouncementId === announcementId) {
        resetAnnouncementForm();
      }
      setToast({ message: "Announcement deleted", severity: "success" });
      await loadAnnouncements();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to delete announcement", severity: "error" });
    } finally {
      setDeletingAnnouncementId(null);
    }
  };

  const handleConvertBounty = (bounty: BountyRequest) => {
    const requester = normalizeIdentity(bounty.requester);
    const matchedUser = users.find((user) => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
      const candidates = [user.id, user.displayName || "", fullName, user.email || ""];
      return candidates.some((candidate) => normalizeIdentity(candidate) === requester);
    });

    setConvertingBountyId(bounty.id);
    setEditingId(null);
    setSourceBountyId(bounty.id);
    setForm({
      name: bounty.title,
      description: bounty.description,
      category: bounty.requestedCategory,
      authorUserId: matchedUser?.id || "",
      version: "",
      downloadUrl: "",
      repoUrl: "",
      websiteUrl: "",
      thumbnailUrl: "",
      tags: ["bounty", "request"],
      installInstructions: bounty.reward ? `## Reward\n${bounty.reward}` : "",
      visibility: "members",
      teamIds: [],
    });
    setThumbnailMode("url");
    setDialogOpen(true);
    setConvertingBountyId(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResults([]);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResults(data.results ?? []);
      const errors = (data.results ?? []).filter((r: { error?: string }) => r.error && r.error !== "Not configured");
      if (errors.length > 0) {
        setToast({ message: `Sync completed with errors on: ${errors.map((r: { provider: string }) => r.provider).join(", ")}`, severity: "error" });
      } else {
        setToast({ message: `Synced ${data.synced} items across all providers`, severity: "success" });
      }
      await loadItems();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Sync failed", severity: "error" });
    } finally {
      setSyncing(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setSourceBountyId(null);
    setForm(EMPTY_FORM);
    setThumbnailMode("url");
    setDialogOpen(true);
  };

  const openEdit = (item: AdminItem) => {
    const matchedAuthor = authorOptions.find(
      (option) => normalizeIdentity(option.label) === normalizeIdentity(item.author)
    );

    setEditingId(item.id);
    setSourceBountyId(null);
    let tags: string[] = [];
    try {
      const parsed: unknown = JSON.parse(item.tags || "[]");
      if (Array.isArray(parsed)) {
        tags = parsed.filter((tag): tag is string => typeof tag === "string");
      }
    } catch {
      tags = [];
    }
    setForm({
      name: item.name,
      description: item.description,
      category: item.category,
      authorUserId: matchedAuthor?.userId || "",
      version: item.version ?? "",
      downloadUrl: item.downloadUrl ?? "",
      repoUrl: item.repoUrl ?? "",
      websiteUrl: item.websiteUrl ?? "",
      thumbnailUrl: item.thumbnailOverride ?? item.thumbnailUrl ?? "",
      tags: tags,
      installInstructions: item.installInstructions ?? "",
      visibility: item.visibility === "teams" ? "teams" : "members",
      teamIds: Array.isArray(item.teamIds) ? item.teamIds : [],
    });
    const effectiveThumbnail = item.thumbnailOverride ?? item.thumbnailUrl ?? "";
    setThumbnailMode(effectiveThumbnail.startsWith("/uploads/") ? "upload" : "url");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        authorUserId: form.authorUserId || undefined,
        tags: form.tags,
        version: form.version || undefined,
        downloadUrl: form.category !== "website" ? (form.downloadUrl || undefined) : undefined,
        repoUrl: form.category !== "website" ? (form.repoUrl || undefined) : undefined,
        websiteUrl: form.category === "website" ? (form.websiteUrl || undefined) : undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
        installInstructions: form.installInstructions || undefined,
        visibility: form.visibility,
        teamIds: form.visibility === "teams" ? form.teamIds : [],
      };

      const url = editingId ? `/api/items/${editingId}` : "/api/items";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const savedItem = await res.json();

      if (!editingId && sourceBountyId) {
        const convertRes = await fetch(`/api/bounties/${sourceBountyId}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: savedItem.id }),
        });
        const convertData = await convertRes.json();
        if (!convertRes.ok) throw new Error(convertData.error || "Failed to mark bounty as collected");
      }

      setToast({
        message: editingId
          ? "Item updated"
          : sourceBountyId
          ? "Listing created from bounty"
          : "Item added",
        severity: "success",
      });
      setDialogOpen(false);
      setSourceBountyId(null);
      await Promise.all([loadItems(), loadBounties(), loadUsers()]);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Save failed", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ message: "Item deleted", severity: "success" });
      await loadItems();
    } else {
      setToast({ message: "Delete failed", severity: "error" });
    }
    setDeleteConfirm(null);
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setForm((f) => ({ ...f, thumbnailUrl: json.url }));
      setToast({ message: "Icon uploaded", severity: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Upload failed", severity: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateUserRole = async (
    userId: string,
    role: AppUserRecord["role"]
  ) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user role");

      setUsers((prev) => prev.map((user) => (user.id === userId ? data : user)));
      setToast({ message: "User role updated", severity: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to update user role", severity: "error" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateUserTeams = async (userId: string, teamIds: string[]) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user teams");

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, teamIds } : user)));
      setToast({ message: "User teams updated", severity: "success" });
      await loadUsers();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to update user teams", severity: "error" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateItemTeams = async (itemId: string, teamIds: string[]) => {
    setUpdatingItemTeamsId(itemId);
    try {
      const normalizedTeamIds = teamIds.map((teamId) => teamId.trim()).filter(Boolean);
      const visibility = normalizedTeamIds.length > 0 ? "teams" : "members";

      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility, teamIds: normalizedTeamIds }),
      });

      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to update listing teams");

      setToast({ message: "Listing teams updated", severity: "success" });
      await loadItems();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to update listing teams", severity: "error" });
    } finally {
      setUpdatingItemTeamsId(null);
    }
  };

  const handleApproveSubmission = async (submissionId: string) => {
    setApprovingSubmissionId(submissionId);
    try {
      const res = await fetch(`/api/listing-submissions/${submissionId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve listing submission");

      setToast({ message: "Listing approved and published", severity: "success" });
      await Promise.all([loadItems(), loadListingSubmissions()]);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to approve listing submission",
        severity: "error",
      });
    } finally {
      setApprovingSubmissionId(null);
    }
  };

  const handleAbortBountyTask = async (bountyId: string) => {
    setAbortingBountyId(bountyId);
    try {
      const res = await fetch(`/api/bounties/${bountyId}/abort`, { method: "POST" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to abort bounty task");

      setToast({ message: "Bounty task aborted", severity: "success" });
      await loadBounties();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to abort bounty task", severity: "error" });
    } finally {
      setAbortingBountyId(null);
    }
  };

  const handleDismissUserTask = async (userId: string) => {
    setDismissingUserTaskId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/dismiss-task`, { method: "POST" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to dismiss role-assignment task");

      setToast({ message: "Role-assignment task dismissed", severity: "success" });
      await loadUsers();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to dismiss role-assignment task", severity: "error" });
    } finally {
      setDismissingUserTaskId(null);
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    setRejectingSubmissionId(submissionId);
    try {
      const res = await fetch(`/api/listing-submissions/${submissionId}/reject`, { method: "POST" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to reject listing submission");

      setToast({ message: "Listing submission rejected", severity: "success" });
      await loadListingSubmissions();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to reject listing submission", severity: "error" });
    } finally {
      setRejectingSubmissionId(null);
    }
  };

  const handleApproveListingDeletionRequest = async (requestId: string) => {
    setApprovingListingDeletionRequestId(requestId);
    try {
      const res = await fetch(`/api/listing-deletion-requests/${requestId}/approve`, { method: "POST" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to approve listing deletion request");

      setToast({ message: "Listing deletion approved", severity: "success" });
      await Promise.all([loadItems(), loadListingDeletionRequests()]);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to approve listing deletion request", severity: "error" });
    } finally {
      setApprovingListingDeletionRequestId(null);
    }
  };

  const handleRejectListingDeletionRequest = async (requestId: string) => {
    setRejectingListingDeletionRequestId(requestId);
    try {
      const res = await fetch(`/api/listing-deletion-requests/${requestId}/reject`, { method: "POST" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to reject listing deletion request");

      setToast({ message: "Listing deletion denied", severity: "success" });
      await loadListingDeletionRequests();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to reject listing deletion request", severity: "error" });
    } finally {
      setRejectingListingDeletionRequestId(null);
    }
  };

  const handleApproveTeam = async (teamId: string) => {
    setApprovingTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/approve`, { method: "POST" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to approve team request");
      setToast({ message: "Team approved", severity: "success" });
      await loadTeams();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to approve team request", severity: "error" });
    } finally {
      setApprovingTeamId(null);
    }
  };

  const handleRejectTeam = async (teamId: string) => {
    setRejectingTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/reject`, { method: "POST" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to reject team request");
      setToast({ message: "Team request rejected", severity: "success" });
      await loadTeams();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to reject team request", severity: "error" });
    } finally {
      setRejectingTeamId(null);
    }
  };

  const handleSaveTeam = async (teamId: string) => {
    const draft = editingTeamById[teamId];
    if (!draft) return;

    setSavingTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name }),
      });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to update team");

      setToast({ message: "Team updated", severity: "success" });
      await loadTeams();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to update team", severity: "error" });
    } finally {
      setSavingTeamId(null);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const confirmed = window.confirm("Delete this team? This also removes team assignments from users and listings.");
    if (!confirmed) return;

    setDeletingTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to delete team");

      setToast({ message: "Team deleted", severity: "success" });
      await Promise.all([loadTeams(), loadUsers(), loadItems()]);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to delete team", severity: "error" });
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleAddTeamMember = async (teamId: string) => {
    const userEmail = (teamMemberEmailByTeamId[teamId] || "").trim();
    if (!userEmail) return;

    setAddingTeamMemberForTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail }),
      });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to add member");

      setTeamMemberEmailByTeamId((prev) => ({ ...prev, [teamId]: "" }));
      setToast({ message: "Member added", severity: "success" });
      setTeamMembersByTeamId((prev) => {
        const copy = { ...prev };
        delete copy[teamId];
        return copy;
      });
      await loadTeamMembers(teamId);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to add member", severity: "error" });
    } finally {
      setAddingTeamMemberForTeamId(null);
    }
  };

  const handleRemoveTeamMember = async (teamId: string, userId: string) => {
    const key = `${teamId}:${userId}`;
    setRemovingTeamMemberKey(key);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to remove member");

      setToast({ message: "Member removed", severity: "success" });
      setTeamMembersByTeamId((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] ?? []).filter((member) => member.userId !== userId),
      }));
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to remove member", severity: "error" });
    } finally {
      setRemovingTeamMemberKey(null);
    }
  };

  const openOwnershipTransferDialog = async (teamId: string) => {
    const members = await loadTeamMembers(teamId);
    const team = teams.find((entry) => entry.id === teamId) ?? null;

    const firstCandidate = members.find((member) => member.userId !== team?.leaderUserId)?.userId ?? "";

    setOwnershipTransferDialog({
      open: true,
      teamId,
      targetUserId: firstCandidate,
      reason: "",
    });
  };

  const handleTransferTeamOwnership = async () => {
    const teamId = ownershipTransferDialog.teamId;
    if (!teamId || !ownershipTransferDialog.targetUserId) {
      setToast({ message: "Select a target owner", severity: "error" });
      return;
    }

    setTransferringTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: ownershipTransferDialog.targetUserId,
          reason: ownershipTransferDialog.reason,
          holdConfirmed: true,
        }),
      });

      const data = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to transfer team ownership");

      setOwnershipTransferDialog({
        open: false,
        teamId: null,
        targetUserId: "",
        reason: "",
      });

      setTeamMembersByTeamId((prev) => {
        const copy = { ...prev };
        delete copy[teamId];
        return copy;
      });

      setToast({ message: "Team ownership transferred", severity: "success" });
      await Promise.all([loadTeams(), loadTeamMembers(teamId)]);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to transfer team ownership", severity: "error" });
    } finally {
      setTransferringTeamId(null);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    if (teamMembersByTeamId[teamId]) return teamMembersByTeamId[teamId];

    setLoadingMembersForTeamId(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, { cache: "no-store" });
      const data = await readJsonSafe<{ error?: string } | TeamMemberRecord[]>(res);
      if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to load team members");

      const members = Array.isArray(data) ? data : [];
      setTeamMembersByTeamId((prev) => ({ ...prev, [teamId]: members }));
      return members;
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load team members", severity: "error" });
      setTeamMembersByTeamId((prev) => ({ ...prev, [teamId]: [] }));
      return [];
    } finally {
      setLoadingMembersForTeamId(null);
    }
  };

  const handleRegisterUser = async () => {
    if (!isAllowedEmail(registerForm.email)) {
      setToast({
        message: `Use a corporate email ending in ${ALLOWED_EMAIL_DOMAIN}`,
        severity: "error",
      });
      return;
    }

    setRegisteringUser(true);
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setRegisterForm({ firstName: "", lastName: "", email: "", password: "" });
      setToast({ message: "User created. You can now log in.", severity: "success" });

      await loadUsers();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to create user", severity: "error" });
    } finally {
      setRegisteringUser(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="h5" fontWeight={700}>
          Admin Panel
        </Typography>
      </Stack>

      {activeTab === "content" && (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" fontWeight={700}>
              Content
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                onClick={handleSync}
                disabled={syncing}
              >
                Sync all providers
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                Add Item
              </Button>
            </Stack>
          </Stack>

          {syncResults.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
              {syncResults.map((r) => (
                <Chip
                  key={r.provider}
                  label={
                    r.error && r.error !== "Not configured"
                      ? `${r.provider}: ${r.error}`
                      : r.error === "Not configured"
                      ? `${r.provider}: not configured`
                      : `${r.provider}: ${r.synced} synced`
                  }
                  color={
                    r.error && r.error !== "Not configured"
                      ? "error"
                      : r.error === "Not configured"
                      ? "default"
                      : "success"
                  }
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
              <Table size="small">
                <TableHead sx={listTableHeadSx}>
                  <TableRow>
                    <TableCell>Actions</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Visibility</TableCell>
                    <TableCell>Teams</TableCell>
                    <TableCell>Install Instructions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    (() => {
                      const sourceChip = getItemSourceChip(item.source);
                      const visibilityChip = getVisibilityChip(item.visibility ?? "members");
                      return (
                    <TableRow key={item.id} hover sx={listTableRowSx}>
                      <TableCell>
                        <Stack direction="column" spacing={0.75} alignItems="flex-start">
                          <Tooltip title="Edit">
                            <IconButton size="small" sx={listActionIconButtonSx} onClick={() => openEdit(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              sx={listActionIconButtonSx}
                              onClick={() => setDeleteConfirm(item.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={CATEGORY_LABELS[item.category] ?? item.category}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: CATEGORY_COLORS[item.category] ?? "#4fc3f7",
                            color: CATEGORY_COLORS[item.category] ?? "#4fc3f7",
                          }}
                        />
                      </TableCell>
                      <TableCell>{item.author}</TableCell>
                      <TableCell>
                        <Chip
                          label={sourceChip.label}
                          size="small"
                          color={sourceChip.color}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.version ?? "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={visibilityChip.label}
                          color={visibilityChip.color}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 240 }}>
                        <TextField
                          select
                          size="small"
                          value={item.teamIds ?? []}
                          onChange={(e) =>
                            handleUpdateItemTeams(
                              item.id,
                              typeof e.target.value === "string"
                                ? e.target.value.split(",")
                                : (e.target.value as string[])
                            )
                          }
                          disabled={updatingItemTeamsId === item.id || item.source !== "manual"}
                          SelectProps={{ multiple: true }}
                          fullWidth
                          helperText={
                            item.source !== "manual"
                              ? "Provider-synced listing: team assignment is locked"
                              : Array.isArray(item.teamNames) && item.teamNames.length > 0
                              ? item.teamNames.join(", ")
                              : "Visible to all members"
                          }
                        >
                          {approvedTeams.map((team) => (
                            <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        {item.installInstructions ? (
                          <Chip label="Yes" size="small" color="info" variant="outlined" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                      );
                    })()
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No items yet. Add one or sync all providers.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

        </>
      )}

      {activeTab === "announcements" && (
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Announcements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create announcements and choose where they are displayed.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={[listTableContainerSx, { p: 2 }]}> 
            <Stack spacing={1.5}>
              {editingAnnouncementId && (
                <Alert severity="info" variant="outlined">
                  Editing announcement. Save changes or cancel to create a new one.
                </Alert>
              )}
              <TextField
                label="Title"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Message"
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, message: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  select
                  label="Display On"
                  value={announcementForm.target}
                  onChange={(e) =>
                    setAnnouncementForm((prev) => ({
                      ...prev,
                      target: e.target.value as "wandelmarket" | "bounties",
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="wandelmarket">Wandelmarket</MenuItem>
                  <MenuItem value="bounties">Bounties</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Status"
                  value={announcementForm.enabled ? "enabled" : "disabled"}
                  onChange={(e) =>
                    setAnnouncementForm((prev) => ({
                      ...prev,
                      enabled: e.target.value === "enabled",
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="enabled">Enabled</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </TextField>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleSaveAnnouncement}
                  disabled={creatingAnnouncement || !!updatingAnnouncementId}
                >
                  {creatingAnnouncement
                    ? "Creating..."
                    : updatingAnnouncementId && editingAnnouncementId === updatingAnnouncementId
                    ? "Saving..."
                    : editingAnnouncementId
                    ? "Save Announcement"
                    : "Create Announcement"}
                </Button>
                {editingAnnouncementId && (
                  <Button
                    variant="outlined"
                    onClick={resetAnnouncementForm}
                    disabled={!!updatingAnnouncementId}
                  >
                    Cancel
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>

          {loadingAnnouncements ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
              <Table size="small">
                <TableHead sx={listTableHeadSx}>
                  <TableRow>
                    <TableCell>Actions</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Display On</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id} hover sx={listTableRowSx}>
                      <TableCell>
                        <Stack direction="column" spacing={0.5} alignItems="flex-start">
                          <Tooltip title="Edit">
                            <span>
                              <IconButton
                                size="small"
                                sx={listActionIconButtonSx}
                                onClick={() => handleEditAnnouncement(announcement)}
                                disabled={deletingAnnouncementId === announcement.id}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={deletingAnnouncementId === announcement.id ? "Deleting..." : "Delete"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                sx={listActionIconButtonSx}
                                onClick={() => void handleDeleteAnnouncement(announcement.id)}
                                disabled={deletingAnnouncementId === announcement.id || updatingAnnouncementId === announcement.id}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>{announcement.title}</TableCell>
                      <TableCell>{announcement.target === "wandelmarket" ? "Wandelmarket" : "Bounties"}</TableCell>
                      <TableCell>
                        <Switch
                          size="small"
                          checked={announcement.enabled}
                          onChange={() => handleToggleAnnouncement(announcement)}
                          color="warning"
                          disabled={updatingAnnouncementId === announcement.id || deletingAnnouncementId === announcement.id}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 520 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {announcement.message}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(announcement.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {announcements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3, color: "text.secondary" }}>
                        No announcements yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      {activeTab === "tasks" && (
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              All Tasks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mixed queue of bounty conversions, user role assignments, and listing approvals.
            </Typography>
          </Box>

          {loadingBounties || loadingUsers || loadingListingSubmissions || loadingListingDeletionRequests || loadingTeams ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
              <Table size="small">
                <TableHead sx={listTableHeadSx}>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Task</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mixedTasks.map((task) => (
                    (() => {
                      const taskTypeChip = getTaskTypeChip(task.type);
                      return (
                    <TableRow key={`${task.type}-${task.id}`} hover sx={listTableRowSx}>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={taskTypeChip.label}
                          color={taskTypeChip.color}
                        />
                      </TableCell>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{task.subtitle}</Typography>
                        <Typography variant="caption" color="text.secondary">{task.meta}</Typography>
                      </TableCell>
                      <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {task.type === "bounty" ? (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleConvertBounty(task.payload)}
                              disabled={convertingBountyId === task.id || abortingBountyId === task.id}
                            >
                              {convertingBountyId === task.id ? "Preparing..." : "Convert"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleAbortBountyTask(task.id)}
                              disabled={convertingBountyId === task.id || abortingBountyId === task.id}
                            >
                              {abortingBountyId === task.id ? "Aborting..." : "Abort"}
                            </Button>
                          </Stack>
                        ) : task.type === "user" ? (
                          <Stack direction="row" spacing={1}>
                            <Button size="small" variant="contained" onClick={() => setAdminTab("users")}>
                              Assign role
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleDismissUserTask(task.id)}
                              disabled={dismissingUserTaskId === task.id}
                            >
                              {dismissingUserTaskId === task.id ? "Dismissing..." : "Deny"}
                            </Button>
                          </Stack>
                        ) : task.type === "listing" ? (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleApproveSubmission(task.id)}
                              disabled={approvingSubmissionId === task.id || rejectingSubmissionId === task.id}
                            >
                              {approvingSubmissionId === task.id ? "Approving..." : "Approve"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleRejectSubmission(task.id)}
                              disabled={approvingSubmissionId === task.id || rejectingSubmissionId === task.id}
                            >
                              {rejectingSubmissionId === task.id ? "Rejecting..." : "Deny"}
                            </Button>
                          </Stack>
                        ) : task.type === "listing-delete" ? (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleApproveListingDeletionRequest(task.id)}
                              disabled={approvingListingDeletionRequestId === task.id || rejectingListingDeletionRequestId === task.id}
                            >
                              {approvingListingDeletionRequestId === task.id ? "Deleting..." : "Approve Delete"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleRejectListingDeletionRequest(task.id)}
                              disabled={approvingListingDeletionRequestId === task.id || rejectingListingDeletionRequestId === task.id}
                            >
                              {rejectingListingDeletionRequestId === task.id ? "Denying..." : "Deny"}
                            </Button>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleApproveTeam(task.id)}
                              disabled={approvingTeamId === task.id || rejectingTeamId === task.id}
                            >
                              {approvingTeamId === task.id ? "Approving..." : "Approve"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleRejectTeam(task.id)}
                              disabled={approvingTeamId === task.id || rejectingTeamId === task.id}
                            >
                              {rejectingTeamId === task.id ? "Rejecting..." : "Deny"}
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                      );
                    })()
                  ))}

                  {mixedTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 3, color: "text.secondary" }}>
                        No pending tasks.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      {activeTab === "analytics" && (
        <Paper variant="outlined" sx={[listTableContainerSx, { p: 2.5, mb: 3 }]}>
          <Typography variant="h6" fontWeight={700} mb={0.5}>
            Usage Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Snapshot based on current catalog metadata and update history.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
              gap: 1.5,
              mb: 2,
            }}
          >
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Total Items</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.totalItems}</Typography>
            </Paper>
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Updated in Last 30 Days</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.recentlyUpdated}</Typography>
            </Paper>
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Install Guide Coverage</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.installCoverage}%</Typography>
              <Typography variant="caption" color="text.secondary">
                {analytics.withInstallInstructions}/{analytics.totalItems} items
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Thumbnail Coverage</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.thumbnailCoverage}%</Typography>
              <Typography variant="caption" color="text.secondary">
                {analytics.withThumbnail}/{analytics.totalItems} items
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Team-Scoped Items</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.teamVisibleItems}</Typography>
              <Typography variant="caption" color="text.secondary">
                {analytics.teamVisibilityCoverage}% of listings
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Manual vs Synced</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.manualItems}/{analytics.providerItems}</Typography>
              <Typography variant="caption" color="text.secondary">
                manual / provider
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Workflow Backlog</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.workflowBacklog}</Typography>
              <Typography variant="caption" color="text.secondary">
                pending admin actions
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="caption" color="text.secondary">Team Assignments</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.totalTeamAssignments}</Typography>
              <Typography variant="caption" color="text.secondary">
                item-to-team links
              </Typography>
            </Paper>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>By Category</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {analytics.categoryBreakdown.map(([category, count]) => (
                  <Chip
                    key={category}
                    label={`${CATEGORY_LABELS[category] ?? category}: ${count}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: CATEGORY_COLORS[category] ?? "divider",
                      color: CATEGORY_COLORS[category] ?? "text.primary",
                    }}
                  />
                ))}
                {analytics.categoryBreakdown.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No data yet.</Typography>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>By Source</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {analytics.sourceBreakdown.map(([source, count]) => {
                  const sourceChip = getItemSourceChip(source);
                  return (
                    <Chip
                      key={source}
                      label={`${sourceChip.label}: ${count}`}
                      size="small"
                      color={sourceChip.color}
                      variant="outlined"
                    />
                  );
                })}
                {analytics.sourceBreakdown.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No data yet.</Typography>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Top Starred Items</Typography>
              <Stack spacing={0.75}>
                {analytics.topStarred.map((item) => (
                  <Typography key={item.id} variant="body2" color="text.secondary">
                    {item.name} ({item.stars})
                  </Typography>
                ))}
                {analytics.topStarred.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No starred items yet.</Typography>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>By Visibility</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {analytics.visibilityBreakdown.map(([visibility, count]) => {
                  const visibilityChip = getVisibilityChip(visibility);
                  return (
                    <Chip
                      key={visibility}
                      label={`${visibilityChip.label}: ${count}`}
                      size="small"
                      color={visibilityChip.color}
                      variant="outlined"
                    />
                  );
                })}
                {analytics.visibilityBreakdown.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No data yet.</Typography>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Bounty Funnel</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {analytics.bountyStatusBreakdown.map(([status, count]) => {
                  const statusChip = getBountyStatusChip(status);
                  return (
                    <Chip
                      key={status}
                      label={`${statusChip.label}: ${count}`}
                      size="small"
                      color={statusChip.color}
                      variant="outlined"
                    />
                  );
                })}
                {analytics.bountyStatusBreakdown.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No bounties yet.</Typography>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Workflow Breakdown</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip label={`Listing review: ${analytics.pendingListingSubmissions}`} size="small" variant="outlined" />
                <Chip label={`Delete requests: ${analytics.pendingDeletionRequests}`} size="small" variant="outlined" />
                <Chip label={`Team requests: ${analytics.pendingTeamRequests}`} size="small" variant="outlined" />
                <Chip label={`Bounty tasks: ${analytics.pendingBountyTasks}`} size="small" variant="outlined" />
                <Chip label={`Role tasks: ${analytics.pendingRoleTasks}`} size="small" variant="outlined" />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Team Request Status</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {analytics.teamStatusBreakdown.map(([status, count]) => {
                  const statusChip = getTeamStatusChip(status);
                  return (
                    <Chip
                      key={status}
                      label={`${statusChip.label}: ${count}`}
                      size="small"
                      color={statusChip.color}
                      variant="outlined"
                    />
                  );
                })}
                {analytics.teamStatusBreakdown.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No teams yet.</Typography>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={[listTableContainerSx, { p: 1.5 }]}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>User Roles</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {analytics.roleBreakdown.map(([role, count]) => {
                  const roleChip = getTeamRoleChip(role);
                  return (
                    <Chip
                      key={role}
                      label={`${roleChip.label}: ${count}`}
                      size="small"
                      color={roleChip.color}
                      variant="outlined"
                    />
                  );
                })}
                {analytics.roleBreakdown.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No users yet.</Typography>
                )}
              </Stack>
            </Paper>
          </Box>
        </Paper>
      )}

      {activeTab === "users" && (
        <Stack spacing={2}>
          <Accordion
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Create User
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a new user with first name, surname, email and password.
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    label="First Name"
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Surname"
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    fullWidth
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    label="Email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    fullWidth
                    error={!!registerForm.email && !isAllowedEmail(registerForm.email)}
                    helperText={`Hint: use your ${ALLOWED_EMAIL_DOMAIN} email.`}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    fullWidth
                    helperText="Minimum 8 characters"
                  />
                </Stack>

                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleRegisterUser}
                    disabled={
                      registeringUser ||
                      !registerForm.firstName ||
                      !registerForm.lastName ||
                      !registerForm.email ||
                      !registerForm.password
                    }
                  >
                    {registeringUser ? "Creating user..." : "Create User"}
                  </Button>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Box>
            <Typography variant="h6" fontWeight={700}>
              Users & Roles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage access roles for admin workflows.
            </Typography>
          </Box>

          {loadingUsers ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
              <Table size="small">
                <TableHead sx={listTableHeadSx}>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>User ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Teams</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover sx={listTableRowSx}>
                      <TableCell>{user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>{user.id}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          select
                          size="small"
                          value={user.role}
                          onChange={(e) =>
                            handleUpdateUserRole(user.id, e.target.value as AppUserRecord["role"])
                          }
                          disabled={updatingUserId === user.id}
                        >
                          <MenuItem value="member">Member</MenuItem>
                          <MenuItem value="moderator">Moderator</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <TextField
                          select
                          size="small"
                          value={user.teamIds ?? []}
                          onChange={(e) =>
                            handleUpdateUserTeams(
                              user.id,
                              typeof e.target.value === "string"
                                ? e.target.value.split(",")
                                : (e.target.value as string[])
                            )
                          }
                          disabled={updatingUserId === user.id}
                          SelectProps={{ multiple: true }}
                          fullWidth
                        >
                          {approvedTeams.map((team) => (
                            <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}

                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3, color: "text.secondary" }}>
                        No users yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      {activeTab === "teams" && (
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Teams
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Teams are collapsed by default. Expand one to see all assigned users.
            </Typography>
          </Box>

          {loadingTeams ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={26} />
            </Box>
          ) : teams.length === 0 ? (
            <Typography color="text.secondary">No teams yet.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {teams.map((team) => (
                (() => {
                  const teamStatusChip = getTeamStatusChip(team.status);
                  return (
                <Accordion
                  key={team.id}
                  disableGutters
                  sx={[
                    listTableContainerSx,
                    {
                      borderRadius: "10px",
                      backgroundColor: "background.paper",
                      "&:before": { display: "none" },
                    },
                  ]}
                  onChange={(_event, expanded) => {
                    if (expanded) {
                      setEditingTeamById((prev) => ({
                        ...prev,
                        [team.id]: prev[team.id] ?? { name: team.name },
                      }));
                      void loadTeamMembers(team.id);
                    }
                  }}
                >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        backgroundColor: "action.hover",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: "100%", pr: 1 }}>
                        <Typography variant="subtitle2" sx={{ minWidth: 180 }}>
                          {team.name}
                        </Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={teamStatusChip.label}
                          color={teamStatusChip.color}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {team.slug}
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: "background.paper" }}>
                      <Stack spacing={1.25}>
                        <Box component="details" sx={{ color: "text.secondary", pb: "1rem" }}>
                          <Box component="summary" sx={{ cursor: "pointer", typography: "body2" }}>
                            Show team details
                          </Box>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 0.75 }}>
                            <Typography variant="body2" color="text.secondary">
                              Leader: {userNameById.get(team.leaderUserId) || team.leaderUserId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Requested by: {userNameById.get(team.createdByUserId) || team.createdByUserId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Created: {new Date(team.createdAt).toLocaleDateString()}
                            </Typography>
                          </Stack>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Leader ID: {team.leaderUserId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Requester ID: {team.createdByUserId}
                            </Typography>
                          </Stack>
                        </Box>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                          <TextField
                            size="small"
                            label="Team Name"
                            value={editingTeamById[team.id]?.name ?? team.name}
                            onChange={(e) =>
                              setEditingTeamById((prev) => ({
                                ...prev,
                                [team.id]: {
                                  name: e.target.value,
                                },
                              }))
                            }
                            fullWidth
                          />
                          <ActionIconButton
                            title={savingTeamId === team.id ? "Saving..." : "Save Team"}
                            loading={savingTeamId === team.id}
                            iconButtonProps={{
                              color: "primary",
                              onClick: () => handleSaveTeam(team.id),
                              disabled: savingTeamId === team.id,
                            }}
                          >
                            <SaveIcon fontSize="small" />
                          </ActionIconButton>
                          <ActionIconButton
                            title={deletingTeamId === team.id ? "Deleting..." : "Delete Team"}
                            loading={deletingTeamId === team.id}
                            iconButtonProps={{
                              color: "error",
                              onClick: () => handleDeleteTeam(team.id),
                              disabled: deletingTeamId === team.id,
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </ActionIconButton>
                          <ActionIconButton
                            title="Transfer Ownership"
                            loading={transferringTeamId === team.id}
                            iconButtonProps={{
                              color: "info",
                              onClick: () => void openOwnershipTransferDialog(team.id),
                              disabled: transferringTeamId === team.id,
                            }}
                          >
                            <CompareArrowsIcon fontSize="small" />
                          </ActionIconButton>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                          <TextField
                            size="small"
                            label="Add Member (email)"
                            value={teamMemberEmailByTeamId[team.id] ?? ""}
                            onChange={(e) =>
                              setTeamMemberEmailByTeamId((prev) => ({ ...prev, [team.id]: e.target.value }))
                            }
                            fullWidth
                          />
                          <ActionIconButton
                            title={addingTeamMemberForTeamId === team.id ? "Adding..." : "Add Member"}
                            loading={addingTeamMemberForTeamId === team.id}
                            iconButtonProps={{
                              color: "primary",
                              onClick: () => handleAddTeamMember(team.id),
                              disabled:
                                addingTeamMemberForTeamId === team.id ||
                                !(teamMemberEmailByTeamId[team.id] ?? "").trim(),
                            }}
                          >
                            <PersonAddIcon fontSize="small" />
                          </ActionIconButton>
                        </Stack>

                        {team.status === "pending" && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleApproveTeam(team.id)}
                              disabled={approvingTeamId === team.id || rejectingTeamId === team.id}
                            >
                              {approvingTeamId === team.id ? "Approving..." : "Approve"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleRejectTeam(team.id)}
                              disabled={approvingTeamId === team.id || rejectingTeamId === team.id}
                            >
                              {rejectingTeamId === team.id ? "Rejecting..." : "Deny"}
                            </Button>
                          </Stack>
                        )}

                        {loadingMembersForTeamId === team.id ? (
                          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                            <CircularProgress size={20} />
                          </Box>
                        ) : (teamMembersByTeamId[team.id] ?? []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No users assigned.
                          </Typography>
                        ) : (
                          <TableContainer component={Paper} variant="outlined" sx={listTableContainerSx}>
                            <Table size="small">
                              <TableHead
                                sx={{
                                  "& .MuiTableCell-root": {
                                    backgroundColor: "action.hover",
                                    position: "relative",
                                    zIndex: 1,
                                  },
                                }}
                              >
                                <TableRow>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Email</TableCell>
                                  <TableCell>User ID</TableCell>
                                  <TableCell>Team Role</TableCell>
                                  <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(teamMembersByTeamId[team.id] ?? []).map((member) => {
                                  const memberRoleChip = getTeamRoleChip(member.role);
                                  const name =
                                    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
                                    member.displayName ||
                                    "—";
                                  return (
                                    <TableRow key={`${team.id}-${member.userId}`}>
                                      <TableCell>{name}</TableCell>
                                      <TableCell>{member.email || "—"}</TableCell>
                                      <TableCell>{member.userId}</TableCell>
                                      <TableCell>
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          label={memberRoleChip.label}
                                          color={memberRoleChip.color}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="small"
                                          color="error"
                                          variant="outlined"
                                          onClick={() => handleRemoveTeamMember(team.id, member.userId)}
                                          disabled={member.role === "leader" || removingTeamMemberKey === `${team.id}:${member.userId}`}
                                        >
                                          {removingTeamMemberKey === `${team.id}:${member.userId}` ? "Removing..." : "Remove"}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Stack>
                    </AccordionDetails>
                </Accordion>
                  );
                })()
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? "Edit Item" : sourceBountyId ? "Convert Bounty to Listing" : "Add Item"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Name"
                required
                fullWidth
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <TextField
                label="Author"
                select
                required
                fullWidth
                value={form.authorUserId}
                onChange={(e) => setForm((f) => ({ ...f, authorUserId: e.target.value }))}
                helperText={
                  form.authorUserId
                    ? undefined
                    : editingId
                    ? "Select a user to change author. Leaving empty keeps the current author."
                    : "Select the listing author from registered users."
                }
              >
                {authorOptions.map((option) => (
                  <MenuItem key={option.userId} value={option.userId}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {editingId && !form.authorUserId ? (
              <Typography variant="caption" color="text.secondary">
                Current author stays unchanged until you pick a user.
              </Typography>
            ) : null}
            <TextField
              label="Description"
              required
              fullWidth
              multiline
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Category"
                select
                required
                fullWidth
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Version"
                fullWidth
                placeholder="e.g. 1.2.0"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              />
            </Stack>
            {form.category === "website" ? (
              <TextField
                label="Website URL"
                fullWidth
                required
                placeholder="https://your-internal-site.example.com"
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              />
            ) : (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Download URL"
                  fullWidth
                  placeholder="https://..."
                  value={form.downloadUrl}
                  onChange={(e) => setForm((f) => ({ ...f, downloadUrl: e.target.value }))}
                />
                <TextField
                  label="Repository URL"
                  fullWidth
                  placeholder="https://github.com/..."
                  value={form.repoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, repoUrl: e.target.value }))}
                />
              </Stack>
            )}
            {/* Thumbnail: upload file or paste URL */}
            <Box>
              <Stack direction="row" spacing={1} mb={1}>
                <Button
                  size="small"
                  variant={thumbnailMode === "upload" ? "contained" : "outlined"}
                  startIcon={<UploadFileIcon />}
                  onClick={() => setThumbnailMode("upload")}
                >
                  Upload icon
                </Button>
                <Button
                  size="small"
                  variant={thumbnailMode === "url" ? "contained" : "outlined"}
                  startIcon={<LinkIcon />}
                  onClick={() => setThumbnailMode("url")}
                >
                  URL
                </Button>
              </Stack>

              {thumbnailMode === "upload" ? (
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading…" : "Choose file"}
                    <input
                      type="file"
                      hidden
                      accept=".svg,.png,.jpg,.jpeg,.webp,.gif,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleThumbnailUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </Button>
                  {form.thumbnailUrl && (
                    <Box
                      component="img"
                      src={form.thumbnailUrl}
                      alt="preview"
                      sx={{ height: 48, width: 48, objectFit: "contain", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                    />
                  )}
                  {form.thumbnailUrl && (
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      {form.thumbnailUrl}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <TextField
                  label="Thumbnail URL"
                  fullWidth
                  placeholder="https://..."
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                />
              )}
            </Box>
<TagInput
              tags={form.tags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
            />
            <TextField
              label="Installation Instructions (Markdown)"
              fullWidth
              multiline
              rows={8}
              placeholder={`## Requirements\n- Python 3.10+\n\n## Steps\n1. Download the extension\n2. Run \`pip install -r requirements.txt\``}
              value={form.installInstructions}
              onChange={(e) => setForm((f) => ({ ...f, installInstructions: e.target.value }))}
              helperText="Supports Markdown: headings, lists, code blocks, etc."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setSourceBountyId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.name || !form.description || !form.category || (!editingId && !form.authorUserId)}
          >
            {saving ? <CircularProgress size={18} /> : editingId ? "Save Changes" : sourceBountyId ? "Create Listing" : "Add Item"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete item?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <TeamOwnershipTransferDialog
        open={ownershipTransferDialog.open}
        members={teamMembersByTeamId[ownershipTransferDialog.teamId ?? ""] ?? []}
        loadingMembers={loadingMembersForTeamId === ownershipTransferDialog.teamId}
        targetUserId={ownershipTransferDialog.targetUserId}
        reason={ownershipTransferDialog.reason}
        loadingConfirm={transferringTeamId === ownershipTransferDialog.teamId}
        onTargetUserIdChange={(value) =>
          setOwnershipTransferDialog((prev) => ({
            ...prev,
            targetUserId: value,
          }))
        }
        onReasonChange={(value) =>
          setOwnershipTransferDialog((prev) => ({
            ...prev,
            reason: value,
          }))
        }
        onClose={() =>
          setOwnershipTransferDialog({
            open: false,
            teamId: null,
            targetUserId: "",
            reason: "",
          })
        }
        onConfirm={() => {
          void handleTransferTeamOwnership();
        }}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)} variant="filled">
          {toast?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
