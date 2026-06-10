"use client";

import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "next/link";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import { usePathname } from "next/navigation";
import CoinPurseIcon from "@/components/icons/CoinPurseIcon";

const ADMIN_USER_ID_KEY = "wandelshop:admin-user-id";
const ADMIN_USER_NAME_KEY = "wandelshop:admin-user-name";

type AuthUser = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
};

function getUserInitials(user: AuthUser): string {
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();

  if (first && last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }

  if (first) {
    return first.slice(0, 2).toUpperCase();
  }

  if (last) {
    return last.slice(0, 2).toUpperCase();
  }

  const displayName = (user.displayName ?? "").trim();
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || "U";
  }

  const emailLocalPart = (user.email ?? "").trim().split("@")[0] ?? "";
  if (emailLocalPart) {
    const normalized = emailLocalPart.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    if (normalized) {
      const parts = normalized.split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
      }
      return parts[0]?.slice(0, 2).toUpperCase() || "U";
    }
  }

  return "U";
}

export default function TopNav({ initialUser = null }: { initialUser?: AuthUser | null }) {
  const pathname = usePathname();
  const [canAccessAdmin, setCanAccessAdmin] = useState(initialUser?.role === "admin");
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialUser));
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarInitials, setAvatarInitials] = useState(initialUser ? getUserInitials(initialUser) : "U");
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const isMarketActive = pathname === "/" || pathname.startsWith("/item/");
  const isBountiesActive = pathname === "/bounties";
  const navValue = isMarketActive ? "market" : isBountiesActive ? "bounties" : false;

  const menuOpen = Boolean(menuAnchorEl);

  useEffect(() => {
    let cancelled = false;

    const loadAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          return;
        }

        const user = (await res.json()) as AuthUser;
        if (!cancelled) {
          setIsAuthenticated(true);
          setCanAccessAdmin(user?.role === "admin");
          setAvatarInitials(getUserInitials(user));
        }
      } catch {
        // Keep server-derived state if client refresh fails.
      }
    };

    void loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.localStorage.removeItem(ADMIN_USER_ID_KEY);
      window.localStorage.removeItem(ADMIN_USER_NAME_KEY);
      window.location.href = "/";
    }
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setMenuAnchorEl(null);
  };

  return (
    <Stack
      component="header"
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      paddingX="1rem"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        zIndex: 1200,
        backgroundColor: "#141623",
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "1px",
          backgroundColor: "rgba(181, 142, 236, 1)",
          pointerEvents: "none",
          zIndex: 2,
        },
      }}
    >
      <Stack direction="row" spacing={2.5} alignItems="center">
        <Tabs
          value={navValue}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Main navigation"
          sx={{
            minHeight: 64,
            "& .MuiTabs-indicator": {
              height: 2,
              bottom: "1px",
              zIndex: 1,
            },
            "& .MuiTab-root": {
              minHeight: 64,
              textTransform: "none",
              fontWeight: 600,
            },
          }}
        >
          <Tab
            component={Link}
            href="/"
            value="market"
            icon={<StorefrontIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="WandelMarket"
          />
          <Tab
            component={Link}
            href="/bounties"
            value="bounties"
            icon={<CoinPurseIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label="Bounties"
          />
        </Tabs>
      </Stack>

      {/* Right side: Admin */}
      <Stack direction="row" spacing={1} alignItems="center">
        {canAccessAdmin && (
          <Button
            component={Link}
            href="/admin"
            size="small"
            startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Admin
          </Button>
        )}
        {isAuthenticated && (
          <IconButton
            size="small"
            onClick={handleOpenUserMenu}
            sx={{ color: "text.secondary" }}
            aria-label="Open user menu"
          >
            <Avatar sx={{ width: 30, height: 30, fontSize: 12 }}>{avatarInitials}</Avatar>
          </IconButton>
        )}
      </Stack>

      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleCloseUserMenu}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem component={Link} href="/user" onClick={handleCloseUserMenu}>
          <PersonIcon fontSize="small" sx={{ mr: 1 }} />
          User
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleCloseUserMenu();
            void handleLogout();
          }}
          disabled={loggingOut}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          {loggingOut ? "Logging out..." : "Logout"}
        </MenuItem>
      </Menu>
    </Stack>
  );
}
