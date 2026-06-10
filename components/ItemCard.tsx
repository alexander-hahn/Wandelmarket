"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "next/link";
import AppsIcon from "@mui/icons-material/Apps";
import ExtensionIcon from "@mui/icons-material/Extension";
import LanguageIcon from "@mui/icons-material/Language";
import FolderIcon from "@mui/icons-material/Folder";
import PrintIcon from "@mui/icons-material/Print";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import type { ShopItem } from "@prisma/client";
import type { ReactNode } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import { CATEGORY_COLORS } from "@/lib/categories";

const CATEGORY_ICONS: Record<string, ReactNode> = {
  app: <AppsIcon sx={{ fontSize: 48 }} />,
  isaac_sim_extension: <ExtensionIcon sx={{ fontSize: 48 }} />,
  website: <LanguageIcon sx={{ fontSize: 48 }} />,
  project: <FolderIcon sx={{ fontSize: 48 }} />,
  "3d_print": <PrintIcon sx={{ fontSize: 48 }} />,
  "3d_asset": <ViewInArIcon sx={{ fontSize: 48 }} />,
};

export default function ItemCard({ item }: { item: ShopItem }) {
  const icon = CATEGORY_ICONS[item.category] ?? <AppsIcon sx={{ fontSize: 48 }} />;
  const color = CATEGORY_COLORS[item.category] ?? "primary.main";
  const thumbnail = item.thumbnailOverride ?? item.thumbnailUrl;
  const hasThumbnail = Boolean(thumbnail);

  return (
    <Box
      component={Link}
      href={`/item/${item.id}`}
      sx={{ textDecoration: "none", display: "block" }}
    >
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.12)",
          bgcolor: hasThumbnail ? "action.hover" : "#10131f",
          color,
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}>
          <FavoriteButton
            itemId={item.id}
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </Box>
        {hasThumbnail ? (
          <Box
            component="img"
            src={thumbnail!}
            alt={item.name}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Box sx={{ color, opacity: 0.95 }}>{icon}</Box>
        )}
      </Paper>
      <Paper
        elevation={8}
        sx={{
          mt: -1,
          mx: 0,
          px: 1,
          py: 0.85,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: "10px",
          borderBottomRightRadius: "10px",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography
          variant="body2"
          align="center"
          sx={{
            fontWeight: 600,
            lineHeight: 1.25,
            minHeight: "2.5em",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "text.primary",
          }}
        >
          {item.name}
        </Typography>
      </Paper>
    </Box>
  );
}
