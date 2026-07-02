"use client";

import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "next/link";
import Box from "@mui/material/Box";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { usePathname, useRouter } from "next/navigation";
import CoinPurseIcon from "@/components/icons/CoinPurseIcon";
import { getUserInitials, type AuthUser } from "@/lib/userUtils";

const ADMIN_USER_ID_KEY = "wandelshop:admin-user-id";
const ADMIN_USER_NAME_KEY = "wandelshop:admin-user-name";

export default function TopNav({ initialUser = null }: { initialUser?: AuthUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [canAccessAdmin, setCanAccessAdmin] = useState(initialUser?.role === "admin");
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialUser));
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarInitials, setAvatarInitials] = useState(initialUser ? getUserInitials(initialUser) : "U");
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [userRole, setUserRole] = useState<string | null>(initialUser?.role ?? null);
  const [taskCount, setTaskCount] = useState(0);
  const [pendingTasks, setPendingTasks] = useState<Array<{ status: string; bountyTitle?: string; itemName?: string; taskType: string }>>([]);
  const isMarketActive = pathname === "/" || pathname.startsWith("/item/");
  const isBountiesActive = pathname === "/bounties";
  const navValue = isMarketActive ? "market" : isBountiesActive ? "bounties" : false;

  const menuOpen = Boolean(menuAnchorEl);
  const notificationMenuOpen = Boolean(notificationAnchorEl);

  const fetchTaskCounts = async (role: string | null) => {
    if (!role) return;

    try {
      let totalTasks = 0;
      const tasks: Array<{ status: string; bountyTitle?: string; itemName?: string; taskType: string }> = [];

      // Fetch approval tasks (for all users)
      const approvalRes = await fetch("/api/bounty-approvals/my-tasks", {
        cache: "no-store",
        credentials: "include",
      });
      if (approvalRes.ok) {
        const approvalTasks = (await approvalRes.json()) as Array<{ status: string; bountyTitle?: string; itemName?: string }>;
        if (Array.isArray(approvalTasks)) {
          const pendingApprovalTasks = approvalTasks.filter((t) => t.status === "pending");
          tasks.push(...pendingApprovalTasks.map((t) => ({ ...t, taskType: "approval" })));
          totalTasks += pendingApprovalTasks.length;
        }
      }

      // Fetch publishing tasks (for admin/moderator only)
      if (role === "admin" || role === "moderator") {
        const publishingRes = await fetch("/api/bounty-publishing/my-tasks", {
          cache: "no-store",
          credentials: "include",
        });
        if (publishingRes.ok) {
          const publishingTasks = (await publishingRes.json()) as Array<{ status: string; bountyTitle?: string; itemName?: string }>;
          if (Array.isArray(publishingTasks)) {
            const pendingPublishingTasks = publishingTasks.filter((t) => t.status === "pending");
            tasks.push(...pendingPublishingTasks.map((t) => ({ ...t, taskType: "publishing" })));
            totalTasks += pendingPublishingTasks.length;
          }
        }
      }

      setTaskCount(totalTasks);
      setPendingTasks(tasks);
    } catch {
      // Silently fail if task fetching fails
    }
  };

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
          setUserRole(user?.role ?? null);
          await fetchTaskCounts(user?.role ?? null);
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

  const handleNotificationsClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setNotificationAnchorEl(null);
  };

  const handleViewAllTasks = () => {
    handleCloseNotifications();
    if (userRole === "admin" || userRole === "moderator") {
      router.push("/admin?section=tasks");
    } else {
      router.push("/user?section=my-tasks");
    }
  };

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

      {/* Right side: User menu */}
      <Stack direction="row" spacing={1} alignItems="center">
        {isAuthenticated && (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <IconButton
                size="small"
                onClick={handleNotificationsClick}
                sx={{
                  color: "text.secondary",
                  ...(taskCount > 0 && {
                    animation: "glow 2s ease-in-out infinite",
                    "@keyframes glow": {
                      "0%, 100%": { textShadow: "0 0 5px rgba(255, 193, 7, 0.5)" },
                      "50%": { textShadow: "0 0 20px rgba(255, 193, 7, 0.8)" },
                    },
                  }),
                }}
                aria-label="Open tasks"
              >
                <NotificationsIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
            <Menu
              anchorEl={notificationAnchorEl}
              open={notificationMenuOpen}
              onClose={handleCloseNotifications}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                sx: {
                  maxWidth: 400,
                  maxHeight: 400,
                },
              }}
            >
              {pendingTasks.length === 0 ? (
                <MenuItem disabled>
                  <span style={{ color: "var(--mui-palette-text-secondary)" }}>No pending tasks</span>
                </MenuItem>
              ) : (
                [
                  ...pendingTasks.slice(0, 5).map((task, idx) => (
                    <MenuItem key={idx}>
                      <Stack spacing={0.5}>
                        <div style={{ fontWeight: 500 }}>{task.bountyTitle || task.itemName}</div>
                        <div style={{ fontSize: "0.875rem", color: "var(--mui-palette-text-secondary)" }}>
                          {task.taskType === "approval"
                            ? `Approve submission for ${task.itemName || "item"}`
                            : "Publish approved bounty"}
                        </div>
                      </Stack>
                    </MenuItem>
                  )),
                  pendingTasks.length > 5 ? (
                    <MenuItem key="more-tasks" disabled>
                      <span style={{ fontSize: "0.875rem", color: "var(--mui-palette-text-secondary)" }}>
                        +{pendingTasks.length - 5} more...
                      </span>
                    </MenuItem>
                  ) : null,
                  <Divider key="divider" />,
                  <MenuItem key="view-all" onClick={handleViewAllTasks}>
                    <span style={{ fontWeight: 600, color: "var(--mui-palette-primary-main)" }}>View all tasks</span>
                  </MenuItem>,
                ].filter(Boolean)
              )}
            </Menu>
          </>
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
        {isAuthenticated && canAccessAdmin && (
          <MenuItem component={Link} href="/admin" onClick={handleCloseUserMenu}>
            <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 1 }} />
            Admin
          </MenuItem>
        )}
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
