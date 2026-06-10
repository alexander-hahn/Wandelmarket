"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import AppsIcon from "@mui/icons-material/Apps";
import ExtensionIcon from "@mui/icons-material/Extension";
import LanguageIcon from "@mui/icons-material/Language";
import FolderIcon from "@mui/icons-material/Folder";
import Link from "next/link";
import type { ReactNode } from "react";
import CardCarousel from "@/components/CardCarousel";
import { CATEGORY_COLORS } from "@/lib/categories";

interface RelatedItem {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  stars: number;
  thumbnailUrl: string | null;
  thumbnailOverride: string | null;
  tags: string[];
}

const CATEGORY_ICONS: Record<string, ReactNode> = {
  app: <AppsIcon sx={{ fontSize: 42 }} />,
  isaac_sim_extension: <ExtensionIcon sx={{ fontSize: 42 }} />,
  website: <LanguageIcon sx={{ fontSize: 42 }} />,
  project: <FolderIcon sx={{ fontSize: 42 }} />,
};

export default function RelatedItemsCarousel({ items }: { items: RelatedItem[] }) {
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (items.length === 0) {
    return <Alert severity="info">No related companion items found yet.</Alert>;
  }

  return (
    <CardCarousel
      items={items}
      index={carouselIndex}
      onIndexChange={setCarouselIndex}
      getItemKey={(item) => item.id}
      cardsPerView={2}
      renderItem={(item) => (
        <Box
          component={Link}
          href={`/item/${item.id}`}
          sx={{ textDecoration: "none", display: "block", height: "100%" }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 1.5,
              height: "100%",
              border: "1px solid rgba(255,255,255,0.12)",
              transition: "transform 0.16s ease, box-shadow 0.16s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: 8,
              },
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: 120,
                mb: 1,
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: CATEGORY_COLORS[item.category] ?? "text.secondary",
                bgcolor: "action.hover",
              }}
            >
              {(item.thumbnailOverride ?? item.thumbnailUrl) ? (
                <Box
                  component="img"
                  src={(item.thumbnailOverride ?? item.thumbnailUrl)!}
                  alt={item.name}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                CATEGORY_ICONS[item.category] ?? <AppsIcon sx={{ fontSize: 42 }} />
              )}
            </Box>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              {item.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: "2.4em",
              }}
            >
              {item.description}
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="caption" color="text.secondary">
                by {item.author}
              </Typography>
              {item.tags[0] && <Chip size="small" label={item.tags[0]} variant="outlined" />}
            </Stack>
          </Paper>
        </Box>
      )}
    />
  );
}