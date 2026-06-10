import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import StarIcon from "@mui/icons-material/Star";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import UserTeamsPanel from "@/components/UserTeamsPanel";
import UserListingsPanel from "@/components/UserListingsPanel";
import UserBountiesPanel from "@/components/UserBountiesPanel";

export const dynamic = "force-dynamic";

export default async function UserPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const activeSection =
    section === "teams" || section === "my-listings" || section === "my-bounties"
      ? section
      : "user";

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";

  if (!token) redirect("/");

  const user = await getSessionUserByToken(token);
  if (!user) redirect("/");

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.displayName || "User";

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {activeSection === "user" ? (
        <Paper id="user" variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h5" fontWeight={700}>
              User Profile
            </Typography>
            <Typography variant="body1">Name: {displayName}</Typography>
            <Typography variant="body1">Email: {user.email || "-"}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1">Role:</Typography>
              <Chip label={user.role} size="small" variant="outlined" />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1">Bounties Collected:</Typography>
              <Box
                sx={{
                  position: "relative",
                  width: 44,
                  height: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <StarIcon sx={{ color: "primary.main", fontSize: 44 }} />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    color: "#1a1a2e",
                    lineHeight: 1,
                  }}
                >
                  {user.collectedBounties}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>
      ) : activeSection === "teams" ? (
        <UserTeamsPanel />
      ) : activeSection === "my-listings" ? (
        <UserListingsPanel />
      ) : (
        <UserBountiesPanel />
      )}
    </Container>
  );
}