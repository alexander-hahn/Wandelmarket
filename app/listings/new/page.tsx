"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import { CATEGORY_OPTIONS } from "@/lib/categories";

interface UserListingEditPayload {
  id: string;
  source: "submission" | "published";
  name: string;
  description: string;
  category: string;
  version: string | null;
  downloadUrl: string | null;
  repoUrl: string | null;
  websiteUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  installInstructions: string | null;
  visibility: "members" | "teams";
  teamIds: string[];
}

export default function NewListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = typeof editId === "string" && editId.trim().length > 0;

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "project",
    version: "",
    downloadUrl: "",
    repoUrl: "",
    websiteUrl: "",
    thumbnailUrl: "",
    tags: "",
    installInstructions: "",
  });
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [visibility, setVisibility] = useState<"members" | "teams">("members");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [importingGithub, setImportingGithub] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEditTarget, setLoadingEditTarget] = useState(false);
  const [editSource, setEditSource] = useState<"submission" | "published" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode || !editId) {
      setEditSource(null);
      return;
    }

    let cancelled = false;

    const loadExistingListing = async () => {
      setLoadingEditTarget(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/user/listings/${editId}`, { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as UserListingEditPayload | { error?: string } | null;

        if (!res.ok || !data || typeof data !== "object" || !("id" in data)) {
          const message =
            (data && typeof data === "object" && "error" in data && typeof data.error === "string"
              ? data.error
              : null) || "Failed to load listing for editing";
          throw new Error(message);
        }

        if (cancelled) return;

        setEditSource(data.source);
        setForm({
          name: data.name ?? "",
          description: data.description ?? "",
          category: data.category ?? "project",
          version: data.version ?? "",
          downloadUrl: data.downloadUrl ?? "",
          repoUrl: data.repoUrl ?? "",
          websiteUrl: data.websiteUrl ?? "",
          thumbnailUrl: data.thumbnailUrl ?? "",
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
          installInstructions: data.installInstructions ?? "",
        });
        setVisibility(data.visibility === "teams" ? "teams" : "members");
        setSelectedTeamIds(Array.isArray(data.teamIds) ? data.teamIds : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listing for editing");
        }
      } finally {
        if (!cancelled) setLoadingEditTarget(false);
      }
    };

    void loadExistingListing();

    return () => {
      cancelled = true;
    };
  }, [editId, isEditMode]);

  useEffect(() => {
    let cancelled = false;

    const loadTeams = async () => {
      try {
        const res = await fetch("/api/teams/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setAvailableTeams(
            data.filter((entry): entry is { id: string; name: string; status: string } =>
              typeof entry?.id === "string" && typeof entry?.name === "string" && typeof entry?.status === "string"
            )
          );
        }
      } catch {
        if (!cancelled) setAvailableTeams([]);
      }
    };

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGithubImport = async () => {
    setImportingGithub(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/listing-submissions/github-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: githubRepoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import metadata from GitHub");

      setForm((prev) => ({
        ...prev,
        name: data.name ?? prev.name,
        description: data.description ?? prev.description,
        category: data.category ?? prev.category,
        version: data.version ?? prev.version,
        downloadUrl: data.downloadUrl ?? prev.downloadUrl,
        repoUrl: data.repoUrl ?? prev.repoUrl,
        websiteUrl: data.websiteUrl ?? prev.websiteUrl,
        thumbnailUrl: data.thumbnailUrl ?? prev.thumbnailUrl,
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : prev.tags,
        installInstructions: data.installInstructions ?? prev.installInstructions,
      }));

      setSuccess("Repository imported. Review the fields, then submit for admin approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import metadata from GitHub");
    } finally {
      setImportingGithub(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...form,
        version: form.version.trim() || null,
        downloadUrl: form.downloadUrl.trim() || null,
        repoUrl: form.repoUrl.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        installInstructions: form.installInstructions.trim() || null,
        visibility,
        teamIds: visibility === "teams" ? selectedTeamIds : [],
      };

      const res = await fetch(isEditMode && editId ? `/api/user/listings/${editId}` : "/api/listing-submissions", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save listing");

      if (isEditMode) {
        setSuccess(
          editSource === "submission"
            ? "Listing submission updated and sent for review."
            : "Listing updated successfully."
        );
      } else {
        setSuccess("Listing submitted. An admin needs to approve it before it appears in the marketplace.");
        setForm({
          name: "",
          description: "",
          category: "project",
          version: "",
          downloadUrl: "",
          repoUrl: "",
          websiteUrl: "",
          thumbnailUrl: "",
          tags: "",
          installInstructions: "",
        });
        setVisibility("members");
        setSelectedTeamIds([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
          <Typography variant="h5" fontWeight={700}>
            {isEditMode ? "Edit Listing" : "Create Listing"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode
              ? "Update your listing using the same submission form."
              : "Submit a listing for admin approval."}
          </Typography>

          <Accordion
            variant="outlined"
            disableGutters
            sx={{ borderColor: "info.main", mt: "1rem !important", borderRadius: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight={700}>
                Before you submit
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert
                severity="info"
                variant="outlined"
                sx={{ borderColor: "info.main", borderRadius: 2 }}
              >
                <Typography variant="body2">
                  1. Make sure your repository is accessible from GitHub and includes a clear README.
                </Typography>
                <Typography variant="body2">
                  2. Create a release or provide a stable download URL so reviewers can validate the build.
                </Typography>
                <Typography variant="body2">
                  3. Add installation steps and required dependencies in Install Instructions.
                </Typography>
                <Typography variant="body2">
                  4. Add metadata in wandelshop.json (optional but recommended): name, category, links, tags, thumbnail.
                </Typography>
                <Typography variant="body2">
                  5. Submission does not publish immediately. Admin review and approval is required before the listing is visible.
                </Typography>
              </Alert>
            </AccordionDetails>
          </Accordion>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>
                Import from GitHub
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paste a GitHub repository URL to prefill this form. You can still edit everything before submitting.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  label="GitHub Repository URL"
                  fullWidth
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                />
                <Button
                  variant="outlined"
                  onClick={handleGithubImport}
                  disabled={importingGithub || !githubRepoUrl.trim()}
                >
                  {importingGithub ? "Importing..." : "Import"}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {isEditMode && loadingEditTarget && <Alert severity="info">Loading listing details...</Alert>}

          <TextField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            label="Description"
            required
            multiline
            rows={4}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Category"
              required
              fullWidth
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              {CATEGORY_OPTIONS.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Version"
              fullWidth
              value={form.version}
              onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
            />
            <TextField
              label="Website URL"
              fullWidth
              value={form.websiteUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
            />
          </Stack>

          <TextField
            select
            label="Visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value === "teams" ? "teams" : "members")}
            helperText="Members: visible to all Wandelbots members. Teams: visible only to selected teams."
          >
            <MenuItem value="members">All Wandelbots members</MenuItem>
            <MenuItem value="teams">Selected teams only</MenuItem>
          </TextField>

          {visibility === "teams" && (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={0.75}>
                Visible Teams
              </Typography>
              {availableTeams.filter((team) => team.status === "approved").length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  You are not assigned to any approved teams yet.
                </Typography>
              ) : (
                <FormGroup>
                  {availableTeams
                    .filter((team) => team.status === "approved")
                    .map((team) => (
                      <FormControlLabel
                        key={team.id}
                        control={
                          <Checkbox
                            checked={selectedTeamIds.includes(team.id)}
                            onChange={(e) => {
                              setSelectedTeamIds((prev) =>
                                e.target.checked ? [...prev, team.id] : prev.filter((id) => id !== team.id)
                              );
                            }}
                          />
                        }
                        label={team.name}
                      />
                    ))}
                </FormGroup>
              )}
            </Paper>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Download URL"
              fullWidth
              value={form.downloadUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, downloadUrl: e.target.value }))}
            />
            <TextField
              label="Repository URL"
              fullWidth
              value={form.repoUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, repoUrl: e.target.value }))}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Thumbnail URL"
              fullWidth
              value={form.thumbnailUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
            />
            <TextField
              label="Tags (comma separated)"
              fullWidth
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
            />
          </Stack>

          <TextField
            label="Install Instructions"
            multiline
            rows={4}
            value={form.installInstructions}
            onChange={(e) => setForm((prev) => ({ ...prev, installInstructions: e.target.value }))}
          />

          <Stack direction="row" spacing={1.5}>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                loadingEditTarget ||
                !form.name ||
                !form.description ||
                (visibility === "teams" && selectedTeamIds.length === 0)
              }
            >
              {saving
                ? isEditMode
                  ? "Saving..."
                  : "Submitting..."
                : isEditMode
                ? "Save Changes"
                : "Submit for Approval"}
            </Button>
            <Button variant="outlined" onClick={() => router.push("/")}>
              Back to Marketplace
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
