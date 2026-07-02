"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import TagInput from "@/components/TagInput";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";

interface CollectBountyDialogProps {
  open: boolean;
  bountyId?: string;
  bountyTitle?: string;
  requestedCategory?: string;
  onClose: () => void;
  onSubmit: (data: BountySubmissionData) => Promise<void>;
  loading?: boolean;
}

export interface BountySubmissionData {
  name: string;
  description: string;
  category: string;
  version?: string;
  downloadUrl?: string;
  repoUrl?: string;
  websiteUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  installInstructions?: string;
  compatibilityOs: string[];
  compatibilityAppVersions: string[];
  compatibilityToolchain: string[];
}

export default function CollectBountyDialog({
  open,
  bountyId,
  bountyTitle,
  requestedCategory = "project",
  onClose,
  onSubmit,
  loading = false,
}: CollectBountyDialogProps) {
  const [formData, setFormData] = useState<BountySubmissionData>({
    name: bountyTitle || "",
    description: "",
    category: requestedCategory,
    version: "",
    downloadUrl: "",
    repoUrl: "",
    websiteUrl: "",
    thumbnailUrl: "",
    tags: [],
    installInstructions: "",
    compatibilityOs: [],
    compatibilityAppVersions: [],
    compatibilityToolchain: [],
  });
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (field: keyof BountySubmissionData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!formData.category.trim()) {
      setError("Category is required");
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
      setFormData({
        name: "",
        description: "",
        category: requestedCategory,
        version: "",
        downloadUrl: "",
        repoUrl: "",
        websiteUrl: "",
        thumbnailUrl: "",
        tags: [],
        installInstructions: "",
        compatibilityOs: [],
        compatibilityAppVersions: [],
        compatibilityToolchain: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit bounty");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Collect Bounty & Submit Listing</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Listing Name"
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            fullWidth
            disabled={loading}
            required
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            disabled={loading}
            required
          />

          <TextField
            select
            label="Category"
            value={formData.category}
            onChange={(e) => handleFieldChange("category", e.target.value)}
            fullWidth
            disabled={loading}
            required
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Version"
            value={formData.version}
            onChange={(e) => handleFieldChange("version", e.target.value)}
            fullWidth
            disabled={loading}
          />

          <TextField
            label="Download URL"
            value={formData.downloadUrl}
            onChange={(e) => handleFieldChange("downloadUrl", e.target.value)}
            fullWidth
            disabled={loading}
            type="url"
          />

          <TextField
            label="Repository URL"
            value={formData.repoUrl}
            onChange={(e) => handleFieldChange("repoUrl", e.target.value)}
            fullWidth
            disabled={loading}
            type="url"
          />

          <TextField
            label="Website URL"
            value={formData.websiteUrl}
            onChange={(e) => handleFieldChange("websiteUrl", e.target.value)}
            fullWidth
            disabled={loading}
            type="url"
          />

          <TextField
            label="Thumbnail URL"
            value={formData.thumbnailUrl}
            onChange={(e) => handleFieldChange("thumbnailUrl", e.target.value)}
            fullWidth
            disabled={loading}
            type="url"
          />

          <TagInput
            tags={formData.tags}
            onChange={(tags) => handleFieldChange("tags", tags)}
          />

          <TextField
            label="Install Instructions (Markdown)"
            value={formData.installInstructions}
            onChange={(e) => handleFieldChange("installInstructions", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            disabled={loading}
          />

          <TagInput
            tags={formData.compatibilityOs}
            onChange={(os) => handleFieldChange("compatibilityOs", os)}
          />

          <TagInput
            tags={formData.compatibilityAppVersions}
            onChange={(versions) => handleFieldChange("compatibilityAppVersions", versions)}
          />

          <TagInput
            tags={formData.compatibilityToolchain}
            onChange={(toolchains) => handleFieldChange("compatibilityToolchain", toolchains)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? "Submitting..." : "Submit Listing"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
