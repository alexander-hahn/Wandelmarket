"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import GitHubIcon from "@mui/icons-material/GitHub";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LanguageIcon from "@mui/icons-material/Language";
import InstallInstructions from "@/components/InstallInstructions";

interface ItemDetailTabsProps {
  description: string;
  category: string;
  websiteUrl: string | null;
  downloadUrl: string | null;
  repoUrl: string | null;
  source: string;
  installInstructions: string | null;
  compatibilityOs: string[];
  compatibilityAppVersions: string[];
  compatibilityToolchain: string[];
}

export default function ItemDetailTabs({
  description,
  category,
  websiteUrl,
  downloadUrl,
  repoUrl,
  source,
  installInstructions,
  compatibilityOs,
  compatibilityAppVersions,
  compatibilityToolchain,
}: ItemDetailTabsProps) {
  const hasInstallInstructions = Boolean(installInstructions && installInstructions.trim().length > 0);
  const hasLinks = Boolean(websiteUrl || downloadUrl || repoUrl);
  const hasCompatibility =
    compatibilityOs.length > 0 ||
    compatibilityAppVersions.length > 0 ||
    compatibilityToolchain.length > 0;

  const initialTab = useMemo(() => 0, []);

  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Box sx={{ mt: 2, mb: 3 }}>
      <Tabs value={activeTab} onChange={(_event, nextTab: number) => setActiveTab(nextTab)}>
        <Tab label="Details" />
        <Tab label="Installation" />
        <Tab label="Compatibility" />
        <Tab label="Links" />
      </Tabs>

      <Box sx={{ pt: 2 }}>
        {activeTab === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {description}
          </Typography>
        ) : activeTab === 1 ? (
          hasInstallInstructions ? (
            <InstallInstructions markdown={installInstructions ?? ""} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No installation instructions provided yet.
            </Typography>
          )
        ) : activeTab === 2 ? (
          hasCompatibility ? (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Supported OS
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {compatibilityOs.length > 0 ? compatibilityOs.join(", ") : "Not specified"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  App Versions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {compatibilityAppVersions.length > 0 ? compatibilityAppVersions.join(", ") : "Not specified"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Toolchain Versions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {compatibilityToolchain.length > 0 ? compatibilityToolchain.join(", ") : "Not specified"}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No compatibility details provided yet.
            </Typography>
          )
        ) : activeTab === 3 ? (
          hasLinks ? (
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {category === "website" && websiteUrl && (
              <Button
                variant="contained"
                startIcon={<LanguageIcon />}
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Website
              </Button>
            )}
            {downloadUrl && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download
              </Button>
            )}
            {repoUrl && (
              <Button
                variant="outlined"
                startIcon={source === "github" ? <GitHubIcon /> : <OpenInNewIcon />}
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Repository
              </Button>
            )}
          </Stack>
          ) : (
          <Typography variant="body2" color="text.secondary">
            No external links available for this listing.
          </Typography>
          )
        ) : (
          <Typography variant="body2" color="text.secondary">
            No external links available for this listing.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
