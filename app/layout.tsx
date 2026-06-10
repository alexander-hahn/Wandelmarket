import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import RequireAuth from "@/components/RequireAuth";
import { SIDEBAR_WIDTH } from "@/components/Sidebar";
import { SESSION_COOKIE_NAME, getSessionUserByToken } from "@/lib/auth/session";
import Box from "@mui/material/Box";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "WandelMarket",
  description: "Internal app & tools library",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
  const sessionUser = token ? await getSessionUserByToken(token) : null;

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ThemeRegistry>
          <RequireAuth>
            <TopNav
              initialUser={
                sessionUser
                  ? {
                      id: sessionUser.id,
                      firstName: sessionUser.firstName,
                      lastName: sessionUser.lastName,
                      displayName: sessionUser.displayName,
                      email: sessionUser.email,
                      role: sessionUser.role,
                    }
                  : null
              }
            />
            <Suspense>
              <Sidebar />
            </Suspense>
            {/* pt pushes content below fixed TopNav; flex row reserves sidebar width via placeholder */}
            <Box sx={{ display: "flex", pt: "64px", height: "100vh", overflow: "hidden" }}>
              {/* Invisible placeholder that reserves exactly the sidebar width */}
              <Box sx={{ width: SIDEBAR_WIDTH, flexShrink: 0 }} />
              <Box
                component="main"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  height: "calc(100vh - 64px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  "&::-webkit-scrollbar": {
                    display: "none",
                    width: 0,
                    height: 0,
                  },
                }}
              >
                {children}
              </Box>
            </Box>
          </RequireAuth>
        </ThemeRegistry>
      </body>
    </html>
  );
}
