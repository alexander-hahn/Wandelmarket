"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import CardCarousel from "@/components/CardCarousel";
import CoinPurseIcon from "@/components/icons/CoinPurseIcon";
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";
import { listTableContainerSx } from "@/lib/listTheme";

interface BountyRequest {
  id: string;
  title: string;
  description: string;
  requester: string;
  requestedCategory: string;
  bountyStars: number;
  reward: string | null;
  status: string;
  createdAt: string;
}

const CATEGORIES = CATEGORY_OPTIONS;

const BOUNTY_VOTES_KEY = "wandelshop:bounty-votes";
const BOUNTY_COLLECTED_KEY = "wandelshop:bounty-collected";
const BOUNTIES_ANNOUNCEMENTS_DISMISSED_KEY = "wandelshop:announcements:dismissed:bounties";

interface PageAnnouncement {
  id: string;
  title: string;
  message: string;
  updatedAt: string;
}

function getAnnouncementDismissKey(announcement: PageAnnouncement): string {
  return `${announcement.id}:${announcement.updatedAt}`;
}

export default function BountiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bounties, setBounties] = useState<BountyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEditTarget, setLoadingEditTarget] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestedCategory, setRequestedCategory] = useState("project");
  const [reward, setReward] = useState("");
  const [votedBountyIds, setVotedBountyIds] = useState<Set<string>>(new Set<string>());
  const [collectedBountyIds, setCollectedBountyIds] = useState<Set<string>>(new Set<string>());
  const [starFlash, setStarFlash] = useState<Record<string, number>>({});
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [collectingBountyId, setCollectingBountyId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<PageAnnouncement[]>([]);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const raw = window.sessionStorage.getItem(BOUNTIES_ANNOUNCEMENTS_DISMISSED_KEY);
      if (!raw) return new Set<string>();
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      const ids = parsed.filter((id): id is string => typeof id === "string");
      return new Set<string>(ids);
    } catch {
      return new Set<string>();
    }
  });

  const activeSection = searchParams.get("section") === "create-bounty" ? "create-bounty" : "open-bounties";
  const editId = searchParams.get("edit");
  const isEditMode = activeSection === "create-bounty" && typeof editId === "string" && editId.trim().length > 0;

  const loadBounties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bounties", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bounties");
      setBounties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bounties");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBounties();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBounties]);

  useEffect(() => {
    let cancelled = false;

    const loadAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements/public?target=bounties", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as PageAnnouncement[] | null;
        if (!res.ok || !Array.isArray(data)) return;
        if (!cancelled) setAnnouncements(data);
      } catch {
        if (!cancelled) setAnnouncements([]);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadAnnouncements();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleDismissAnnouncement = (announcementId: string) => {
    setDismissedAnnouncementIds((prev) => {
      const next = new Set(prev);
      next.add(announcementId);
      try {
        window.sessionStorage.setItem(
          BOUNTIES_ANNOUNCEMENTS_DISMISSED_KEY,
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Ignore storage failures; in-memory dismissal still works.
      }
      return next;
    });
  };

  const visibleAnnouncements = useMemo(
    () => announcements.filter((announcement) => !dismissedAnnouncementIds.has(getAnnouncementDismissKey(announcement))),
    [announcements, dismissedAnnouncementIds]
  );

  useEffect(() => {
    const categoryFromUrl = searchParams.get("requestedCategory");
    if (categoryFromUrl) {
      const timeoutId = window.setTimeout(() => {
        setRequestedCategory(categoryFromUrl);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isEditMode || !editId) return;

    let cancelled = false;

    const loadBounty = async () => {
      setLoadingEditTarget(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/user/bounties/${editId}`, { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as
          | {
              id: string;
              title: string;
              description: string;
              requestedCategory: string;
              reward: string | null;
              status: string;
            }
          | { error?: string }
          | null;

        if (!res.ok || !data || typeof data !== "object" || !("id" in data)) {
          const message =
            (data && typeof data === "object" && "error" in data && typeof data.error === "string"
              ? data.error
              : null) || "Failed to load bounty";
          throw new Error(message);
        }

        if (cancelled) return;

        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setRequestedCategory(data.requestedCategory ?? "project");
        setReward(data.reward ?? "");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load bounty");
      } finally {
        if (!cancelled) setLoadingEditTarget(false);
      }
    };

    void loadBounty();

    return () => {
      cancelled = true;
    };
  }, [editId, isEditMode]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BOUNTY_VOTES_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const timeoutId = window.setTimeout(() => {
          setVotedBountyIds(new Set(parsed.filter((id): id is string => typeof id === "string")));
        }, 0);

        return () => window.clearTimeout(timeoutId);
      }
    } catch {
      // Ignore malformed vote cache
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BOUNTY_COLLECTED_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const timeoutId = window.setTimeout(() => {
          setCollectedBountyIds(new Set(parsed.filter((id): id is string => typeof id === "string")));
        }, 0);

        return () => window.clearTimeout(timeoutId);
      }
    } catch {
      // Ignore malformed collect cache
    }
  }, []);

  const openBounties = useMemo(
    () =>
      bounties
        .filter((bounty) => bounty.status === "open" || bounty.status === "pending")
        .sort((a, b) => b.bountyStars - a.bountyStars),
    [bounties]
  );

  const popularBounties = useMemo(() => openBounties.slice(0, 10), [openBounties]);

  useEffect(() => {
    if (popularBounties.length === 0) {
      const timeoutId = window.setTimeout(() => {
        setCarouselIndex(0);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    if (carouselIndex > popularBounties.length - 1) {
      const timeoutId = window.setTimeout(() => {
        setCarouselIndex(0);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [popularBounties, carouselIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = isEditMode && editId ? `/api/user/bounties/${editId}` : "/api/bounties";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          requestedCategory,
          reward,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save request");

      if (isEditMode) {
        setSuccess("Bounty updated.");
        router.replace("/bounties?section=open-bounties");
      } else {
        setTitle("");
        setDescription("");
        setRequestedCategory("project");
        setReward("");
        setSuccess("Request submitted as a bounty.");
      }
      await loadBounties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBountyStar = async (bountyId: string) => {
    const wasVoted = votedBountyIds.has(bountyId);
    const delta = wasVoted ? -1 : 1;

    const previousVotes = new Set(votedBountyIds);
    const nextVotes = new Set(votedBountyIds);
    if (wasVoted) nextVotes.delete(bountyId);
    else nextVotes.add(bountyId);

    const previousBounties = bounties;

    setVotedBountyIds(nextVotes);
    window.localStorage.setItem(BOUNTY_VOTES_KEY, JSON.stringify(Array.from(nextVotes)));

    setBounties((prev) =>
      prev.map((bounty) =>
        bounty.id === bountyId
          ? { ...bounty, bountyStars: Math.max(1, bounty.bountyStars + delta) }
          : bounty
      )
    );

    setStarFlash((prev) => ({ ...prev, [bountyId]: (prev[bountyId] ?? 0) + 1 }));

    try {
      const res = await fetch(`/api/bounties/${bountyId}/stars`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update bounty stars");

      setBounties((prev) =>
        prev.map((bounty) =>
          bounty.id === bountyId && data?.bountyStars !== undefined
            ? { ...bounty, bountyStars: data.bountyStars }
            : bounty
        )
      );
    } catch (err) {
      setVotedBountyIds(previousVotes);
      window.localStorage.setItem(BOUNTY_VOTES_KEY, JSON.stringify(Array.from(previousVotes)));
      setBounties(previousBounties);
      setError(err instanceof Error ? err.message : "Failed to update bounty stars");
    }
  };

  const handleCollectBounty = async (bountyId: string) => {
    const wasCollectedByMe = collectedBountyIds.has(bountyId);

    if (wasCollectedByMe) {
      setCollectingBountyId(bountyId);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/bounties/${bountyId}/collect`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to remove bounty task");

        const nextCollected = new Set(collectedBountyIds);
        nextCollected.delete(bountyId);
        setCollectedBountyIds(nextCollected);
        window.localStorage.setItem(BOUNTY_COLLECTED_KEY, JSON.stringify(Array.from(nextCollected)));

        setSuccess("Bounty moved back to open and task removed.");
        await loadBounties();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove bounty task");
      } finally {
        setCollectingBountyId(null);
      }

      return;
    }

    setCollectingBountyId(bountyId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/bounties/${bountyId}/collect`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to collect bounty");

      const nextCollected = new Set(collectedBountyIds);
      nextCollected.add(bountyId);
      setCollectedBountyIds(nextCollected);
      window.localStorage.setItem(BOUNTY_COLLECTED_KEY, JSON.stringify(Array.from(nextCollected)));

      setSuccess("Bounty marked as pending and toggled as collected for you.");
      await loadBounties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to collect bounty");
    } finally {
      setCollectingBountyId(null);
    }
  };

  const renderBountyCard = (bounty: BountyRequest, popularRank?: number) => (
    (() => {
      const isCollectedByMe = collectedBountyIds.has(bounty.id);
      return (
    <Paper
      variant="outlined"
      sx={[
        listTableContainerSx,
        {
          p: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          overflow: "hidden",
        },
      ]}
    >
      <Box sx={{ position: "relative", py: 0.5 }}>
        {popularRank ? (
          <Typography
            variant="h6"
            fontWeight={800}
            lineHeight={1}
            sx={{ position: "absolute", left: 6, top: 8 }}
          >
            {popularRank}
          </Typography>
        ) : null}

        {!popularRank && (
          <Box sx={{ position: "absolute", right: 0, top: 4 }}>
            <Tooltip title={isCollectedByMe ? "Pending task toggled for you" : "Collect bounty (create pending task)"}>
              <span>
                <IconButton
                  size="small"
                  sx={
                    isCollectedByMe
                      ? {
                          color: "text.secondary",
                          "& svg *": {
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: 1.8,
                          },
                        }
                      : { color: "#f6c33b" }
                  }
                  onClick={() => handleCollectBounty(bounty.id)}
                  disabled={collectingBountyId === bounty.id}
                  aria-label="Collect bounty"
                >
                  <CoinPurseIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}

        {popularRank && (
          <Box sx={{ position: "absolute", right: 6, top: 6 }}>
            <Tooltip title={isCollectedByMe ? "Pending task toggled for you" : "Collect bounty (create pending task)"}>
              <span>
                <IconButton
                  size="small"
                  sx={
                    isCollectedByMe
                      ? {
                          color: "text.secondary",
                          p: 0,
                          "& svg *": {
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: 1.8,
                          },
                        }
                      : { color: "#f6c33b", p: 0 }
                  }
                  onClick={() => handleCollectBounty(bounty.id)}
                  disabled={collectingBountyId === bounty.id}
                  aria-label="Collect bounty"
                >
                  <CoinPurseIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}

        <Stack alignItems="center" justifyContent="center">
          <IconButton
            aria-label="Toggle bounty star"
            onClick={() => handleToggleBountyStar(bounty.id)}
            sx={{ p: 0.25 }}
          >
            <Box
              key={`${bounty.id}-${starFlash[bounty.id] ?? 0}`}
              sx={{
                position: "relative",
                width: 80,
                height: 80,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                "@keyframes bountyStarPop": {
                  "0%": { transform: "scale(0.9)", filter: "drop-shadow(0 0 0 rgba(255,193,7,0))" },
                  "35%": { transform: "scale(1.14)", filter: "drop-shadow(0 0 8px rgba(255,193,7,0.6))" },
                  "100%": { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(255,193,7,0))" },
                },
                animation: "bountyStarPop 220ms ease-out",
              }}
            >
              <StarIcon
                sx={{
                  color: votedBountyIds.has(bounty.id) ? "primary.main" : "#ffffff",
                  fontSize: 80,
                }}
              />
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: "#1a1a2e",
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                {bounty.bountyStars}
              </Typography>
            </Box>
          </IconButton>
        </Stack>
      </Box>

      <Stack alignItems="center" spacing={0.75}>
        <Typography variant="subtitle1" fontWeight={700} align="center">
          {bounty.title}
        </Typography>
      </Stack>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: "2.6em",
        }}
      >
        {bounty.description}
      </Typography>

      {bounty.reward && (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Reward: {bounty.reward}
        </Typography>
      )}

      <Box
        sx={{
          backgroundColor: "action.hover",
          mx: -2,
          mb: -2,
          px: 2,
          mt: "auto",
          height: 56,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
          <Typography variant="caption" color="text.secondary">
            Requested by {bounty.requester}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Chip
              size="small"
              label={CATEGORY_LABELS[bounty.requestedCategory] ?? bounty.requestedCategory}
              variant="outlined"
              sx={{
                borderColor: CATEGORY_COLORS[bounty.requestedCategory] ?? "divider",
                color: CATEGORY_COLORS[bounty.requestedCategory] ?? "text.primary",
              }}
            />
          </Stack>
        </Stack>
      </Box>
    </Paper>
      );
    })()
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {visibleAnnouncements.length > 0 && (
        <Stack spacing={1} mb={2}>
          {visibleAnnouncements.map((announcement) => (
            <Alert
              key={announcement.id}
              variant="outlined"
              severity="warning"
              onClose={() => handleDismissAnnouncement(getAnnouncementDismissKey(announcement))}
              sx={{
                borderColor: "#f59e0b",
                color: "#fbbf24",
                "& .MuiAlert-icon": {
                  color: "#f59e0b",
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.25, color: "#fbbf24" }}>
                {announcement.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {announcement.message}
              </Typography>
            </Alert>
          ))}
        </Stack>
      )}

      <Typography variant="body1" color="text.secondary" mb={3}>
        Request missing tools or models. Admins can convert accepted requests into listings.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {activeSection === "open-bounties" && (
      <>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Most Popular Bounties
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Top {popularBounties.length}
          </Typography>
        </Stack>

        {!loading && popularBounties.length > 0 && (
          <>
            <CardCarousel
              items={popularBounties}
              index={carouselIndex}
              onIndexChange={setCarouselIndex}
              getItemKey={(bounty) => bounty.id}
              cardsPerView={2}
              repeatToFill
              controlsMarginBottom={2}
              renderItem={(bounty, meta) => renderBountyCard(bounty, meta.absoluteIndex + 1)}
            />
          </>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            All Bounties
          </Typography>
          <Chip label={`${openBounties.length} open`} size="small" />
        </Stack>

        {loading ? (
          <Stack direction="row" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : openBounties.length === 0 ? (
          <Typography color="text.secondary">No open bounties yet.</Typography>
        ) : (
          <Grid container spacing={2}>
            {openBounties.map((bounty) => (
              <Grid key={bounty.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                {renderBountyCard(bounty)}
              </Grid>
            ))}
          </Grid>
        )}

      </>
      )}

      {activeSection === "create-bounty" && (
      <Paper variant="outlined" sx={[listTableContainerSx, { p: 2.5 }]}> 
        <Typography variant="h6" fontWeight={700} mb={2}>
          {isEditMode ? "Edit Bounty" : "Request an Item"}
        </Typography>

        {isEditMode && loadingEditTarget ? <Alert severity="info" sx={{ mb: 2 }}>Loading bounty details...</Alert> : null}

        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="What do you need?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
            required
            fullWidth
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Category"
              select
              value={requestedCategory}
              onChange={(e) => setRequestedCategory(e.target.value)}
              fullWidth
            >
              {CATEGORIES.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Reward / Bounty note (optional)"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="e.g. coffee + brownie, 20 EUR, internal kudos"
            fullWidth
          />

          <Stack direction="row" justifyContent="flex-end">
            <Button type="submit" variant="contained" disabled={submitting || loadingEditTarget}>
              {submitting ? (isEditMode ? "Saving..." : "Submitting...") : isEditMode ? "Save Changes" : "Post Bounty"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
      )}
    </Container>
  );
}
