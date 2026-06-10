"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import GridViewIcon from "@mui/icons-material/GridView";
import AppsIcon from "@mui/icons-material/Apps";
import ExtensionIcon from "@mui/icons-material/Extension";
import LanguageIcon from "@mui/icons-material/Language";
import FolderIcon from "@mui/icons-material/Folder";
import PrintIcon from "@mui/icons-material/Print";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PostAddIcon from "@mui/icons-material/PostAdd";
import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";
import CampaignIcon from "@mui/icons-material/Campaign";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORY_COLORS, CATEGORY_OPTIONS } from "@/lib/categories";

const FAVORITES_KEY = "wandelshop:favorites";
const FAVORITES_CHANGED_EVENT = "wandelshop:favorites:changed";

const BOUNTY_SECTIONS = [
  { value: "open-bounties", label: "Bouty Listings", icon: <EmojiEventsIcon fontSize="small" />, color: "#b58eec" },
  { value: "create-bounty", label: "Create Bounty", icon: <PostAddIcon fontSize="small" />, color: "#b58eec" },
];

const CATEGORIES = [
  { value: "all", label: "All", icon: <GridViewIcon fontSize="small" />, color: undefined },
  ...CATEGORY_OPTIONS.map((category) => ({
    value: category.value,
    label:
      category.value === "app"
        ? "Apps"
        : category.value === "website"
        ? "Websites"
        : category.value === "project"
        ? "Projects"
        : category.value === "isaac_sim_extension"
        ? "Isaac Sim Extensions"
        : category.value === "3d_asset"
        ? "3D Assets"
        : category.label,
    icon:
      category.value === "app" ? (
        <AppsIcon fontSize="small" />
      ) : category.value === "isaac_sim_extension" ? (
        <ExtensionIcon fontSize="small" />
      ) : category.value === "website" ? (
        <LanguageIcon fontSize="small" />
      ) : category.value === "project" ? (
        <FolderIcon fontSize="small" />
      ) : category.value === "3d_print" ? (
        <PrintIcon fontSize="small" />
      ) : (
        <ViewInArIcon fontSize="small" />
      ),
    color: CATEGORY_COLORS[category.value],
  })),
];

const ADMIN_SECTIONS = [
  { value: "content", label: "Content", icon: <GridViewIcon fontSize="small" /> },
  { value: "announcements", label: "Announcements", icon: <CampaignIcon fontSize="small" /> },
  { value: "tasks", label: "Tasks", icon: <PostAddIcon fontSize="small" /> },
  { value: "users", label: "Users", icon: <PersonIcon fontSize="small" /> },
  { value: "teams", label: "Teams", icon: <GroupsIcon fontSize="small" /> },
  { value: "analytics", label: "Analytics", icon: <AppsIcon fontSize="small" /> },
];

const USER_SECTIONS = [
  { value: "user", label: "User", icon: <PersonIcon fontSize="small" /> },
  { value: "teams", label: "Teams", icon: <GroupsIcon fontSize="small" /> },
  { value: "my-listings", label: "My Listings", icon: <PostAddIcon fontSize="small" /> },
  { value: "my-bounties", label: "My Bounties", icon: <EmojiEventsIcon fontSize="small" /> },
];

export const SIDEBAR_WIDTH = 240;

// MUI AppBar default height
const TOPNAV_HEIGHT = 64;

export default function Sidebar({ counts }: { counts?: Record<string, number> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = pathname === "/" ? (searchParams.get("category") ?? "all") : null;
  const activeTeam = pathname === "/" ? (searchParams.get("team") ?? "all") : "all";
  const activeBountySection = pathname === "/bounties" ? (searchParams.get("section") ?? "open-bounties") : "open-bounties";
  const activeAdminSection = pathname.startsWith("/admin") ? (searchParams.get("tab") ?? "content") : "content";
  const activeUserSection = pathname === "/user" ? (searchParams.get("section") ?? "user") : "user";
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; slug: string; status?: string }>>([]);

  useEffect(() => {
    const updateFavoriteCount = () => {
      try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (!raw) {
          setFavoriteCount(0);
          return;
        }

        const parsed: unknown = JSON.parse(raw);
        setFavoriteCount(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string").length : 0);
      } catch {
        setFavoriteCount(0);
      }
    };

    updateFavoriteCount();
    window.addEventListener("storage", updateFavoriteCount);
    window.addEventListener(FAVORITES_CHANGED_EVENT, updateFavoriteCount as EventListener);

    return () => {
      window.removeEventListener("storage", updateFavoriteCount);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, updateFavoriteCount as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTeams = async () => {
      if (pathname !== "/") {
        setTeams([]);
        return;
      }

      try {
        const res = await fetch("/api/teams/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setTeams(
            data.filter((entry): entry is { id: string; name: string; slug: string; status?: string } =>
              typeof entry?.id === "string" && typeof entry?.name === "string" && typeof entry?.slug === "string"
            )
          );
        }
      } catch {
        if (!cancelled) setTeams([]);
      }
    };

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Box
      component="nav"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        position: "fixed",
        top: TOPNAV_HEIGHT,
        left: 0,
        height: `calc(100vh - ${TOPNAV_HEIGHT}px)`,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "#141623",
        zIndex: 1100,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          pt: 2,
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
            width: 0,
            height: 0,
          },
        }}
      >
        {pathname === "/bounties" ? (
          <>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.disabled"
              sx={{ px: 1, letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 0.5 }}
            >
              Bounties
            </Typography>
            <List dense disablePadding>
              {BOUNTY_SECTIONS.map((section) => {
                const isSelected = activeBountySection === section.value;

                return (
                  <ListItemButton
                    key={section.value}
                    component={Link}
                    href={`/bounties?section=${section.value}`}
                    selected={isSelected}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.25,
                      "&.Mui-selected": {
                        backgroundColor: `${section.color}22`,
                        "&:hover": { backgroundColor: `${section.color}33` },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: isSelected ? section.color : "text.secondary" }}>
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={section.label}
                      slotProps={{
                        primary: {
                          variant: "body2",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? section.color : "text.primary",
                        },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </>
        ) : pathname.startsWith("/admin") ? (
          <>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.disabled"
              sx={{ px: 1, letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 0.5 }}
            >
              Admin
            </Typography>
            <List dense disablePadding>
              {ADMIN_SECTIONS.map((section) => {
                const isSelected = activeAdminSection === section.value;

                return (
                  <ListItemButton
                    key={section.value}
                    component={Link}
                    href={`/admin?tab=${section.value}`}
                    selected={isSelected}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.25,
                      "&.Mui-selected": {
                        backgroundColor: "action.selected",
                        "&:hover": { backgroundColor: "action.selected" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: isSelected ? "primary.main" : "text.secondary" }}>
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={section.label}
                      slotProps={{
                        primary: {
                          variant: "body2",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "primary.main" : "text.primary",
                        },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </>
        ) : pathname === "/user" ? (
          <>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.disabled"
              sx={{ px: 1, letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 0.5 }}
            >
              User
            </Typography>
            <List dense disablePadding>
              {USER_SECTIONS.map((section) => {
                const isSelected = activeUserSection === section.value;
                return (
                  <ListItemButton
                    key={section.value}
                    component={Link}
                    href={`/user?section=${section.value}`}
                    selected={isSelected}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.25,
                      "&.Mui-selected": {
                        backgroundColor: "action.selected",
                        "&:hover": { backgroundColor: "action.selected" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: isSelected ? "primary.main" : "text.secondary" }}>
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={section.label}
                      slotProps={{
                        primary: {
                          variant: "body2",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "primary.main" : "text.primary",
                        },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </>
        ) : (
          <>
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.disabled"
          sx={{ px: 1, letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 0.5 }}
        >
          My
        </Typography>
        <List dense disablePadding>
          <ListItemButton
            component={Link}
            href="/?category=favorites"
            selected={activeCategory === "favorites"}
            sx={(theme) => ({
              borderRadius: 1.5,
              mb: 0.25,
              "&.Mui-selected": {
                backgroundColor: alpha(theme.palette.primary.main, 0.14),
                "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
              },
            })}
          >
            <ListItemIcon sx={{ minWidth: 34, color: activeCategory === "favorites" ? "primary.main" : "text.secondary" }}>
              <FavoriteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="My Favorites"
              slotProps={{
                primary: {
                  variant: "body2",
                  fontWeight: activeCategory === "favorites" ? 600 : 400,
                  color: activeCategory === "favorites" ? "primary.main" : "text.primary",
                },
              }}
            />
            <Typography variant="caption" color="text.disabled">
              {favoriteCount}
            </Typography>
          </ListItemButton>
        </List>

        <Divider sx={{ my: 1 }} />

        <Typography
          variant="caption"
          fontWeight={600}
          color="text.disabled"
          sx={{ px: 1, letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 0.5 }}
        >
          Browse
        </Typography>
        <List dense disablePadding>
          {CATEGORIES.map((c) => {
            const isSelected = activeCategory === c.value;
            const href = c.value === "all" ? "/" : `/?category=${c.value}`;

            return (
              <Box key={c.value}>
                <ListItemButton
                  component={Link}
                  href={href}
                  selected={isSelected}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.25,
                    "&.Mui-selected": {
                      backgroundColor: c.color ? `${c.color}22` : "action.selected",
                      "&:hover": { backgroundColor: c.color ? `${c.color}33` : "action.selected" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: isSelected ? (c.color ?? "primary.main") : "text.secondary" }}>
                    {c.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={c.label}
                    slotProps={{
                      primary: {
                        variant: "body2",
                        fontWeight: isSelected ? 600 : 400,
                        color: c.color && isSelected ? c.color : "text.primary",
                      },
                    }}
                  />
                  {counts && (
                    <Typography variant="caption" color="text.disabled">
                      {counts[c.value] ?? 0}
                    </Typography>
                  )}
                </ListItemButton>
              </Box>
            );
          })}
        </List>

        {teams.filter((team) => (team.status ?? "approved") === "approved").length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.disabled"
              sx={{ px: 1, letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 0.5 }}
            >
              Teams
            </Typography>
            <List dense disablePadding>
              <ListItemButton
                component={Link}
                href={activeCategory === "all" ? "/" : `/?category=${activeCategory}`}
                selected={activeTeam === "all"}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.25,
                  "&.Mui-selected": {
                    backgroundColor: "action.selected",
                    "&:hover": { backgroundColor: "action.selected" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: activeTeam === "all" ? "primary.main" : "text.secondary" }}>
                  <GroupsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="All Teams" slotProps={{ primary: { variant: "body2" } }} />
              </ListItemButton>

              {teams
                .filter((team) => (team.status ?? "approved") === "approved")
                .map((team) => {
                  const isSelected = activeTeam === team.slug;
                  const params = new URLSearchParams();
                  if (activeCategory && activeCategory !== "all") params.set("category", activeCategory);
                  params.set("team", team.slug);

                  return (
                    <ListItemButton
                      key={team.id}
                      component={Link}
                      href={`/?${params.toString()}`}
                      selected={isSelected}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.25,
                        "&.Mui-selected": {
                          backgroundColor: "action.selected",
                          "&:hover": { backgroundColor: "action.selected" },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34, color: isSelected ? "primary.main" : "text.secondary" }}>
                        <GroupsIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={team.name} slotProps={{ primary: { variant: "body2" } }} />
                    </ListItemButton>
                  );
                })}
            </List>
          </>
        )}
          </>
        )}
      </Box>
    </Box>
  );
}
