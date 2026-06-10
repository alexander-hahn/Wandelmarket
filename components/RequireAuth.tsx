"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

const ALLOWED_EMAIL_DOMAIN = "@wandelbots.com";

function isAllowedEmail(value: string) {
  return value.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [activeTab, setActiveTab] = useState<"login" | "create">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!cancelled) setIsAuthenticated(res.ok);
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async () => {
    setError(null);
    if (!isAllowedEmail(loginForm.email)) {
      setError(`Use a corporate email ending in ${ALLOWED_EMAIL_DOMAIN}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      setIsAuthenticated(true);
      setLoginForm((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setError(null);
    if (!isAllowedEmail(createForm.email)) {
      setError(`Use a corporate email ending in ${ALLOWED_EMAIL_DOMAIN}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Account creation failed");

      setCreateForm({ firstName: "", lastName: "", email: "", password: "" });
      setActiveTab("login");
      setError("Account created successfully. Please log in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body2" color="text.secondary">Checking session...</Typography>
      </Box>
    );
  }

  if (isAuthenticated) return <>{children}</>;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background:
          "radial-gradient(circle at 15% 20%, rgba(79, 195, 247, 0.16), transparent 35%), radial-gradient(circle at 85% 0%, rgba(255, 183, 77, 0.18), transparent 40%), #0f1119",
      }}
    >
      <Paper variant="outlined" sx={{ width: "100%", maxWidth: 560, p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={0.5}>
          WandelMarket Access
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Login or create an account to access the app.
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_e, value: "login" | "create") => {
            setActiveTab(value);
            setError(null);
          }}
          sx={{ mb: 2 }}
        >
          <Tab value="login" label="Login" />
          <Tab value="create" label="Create Account" />
        </Tabs>

        {error && <Alert severity={error.includes("successfully") ? "success" : "error"} sx={{ mb: 2 }}>{error}</Alert>}

        {activeTab === "login" ? (
          <Stack spacing={1.5}>
            <TextField
              label="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              error={!!loginForm.email && !isAllowedEmail(loginForm.email)}
              helperText={`Only ${ALLOWED_EMAIL_DOMAIN} addresses are allowed.`}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleLogin}
              disabled={loading || !loginForm.email || !loginForm.password}
            >
              {loading ? "Signing in..." : "Login"}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="First Name"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Surname"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              error={!!createForm.email && !isAllowedEmail(createForm.email)}
              helperText={`Hint: use your ${ALLOWED_EMAIL_DOMAIN} email.`}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              helperText="Minimum 8 characters"
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={handleCreateAccount}
              disabled={
                loading ||
                !createForm.firstName ||
                !createForm.lastName ||
                !createForm.email ||
                !createForm.password
              }
            >
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
