import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

function getSessionTokenFromCookieHeader(cookieHeader: string): string {
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const sessionPart = parts.find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return sessionPart ? decodeURIComponent(sessionPart.slice(`${SESSION_COOKIE_NAME}=`.length)) : "";
}

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = getSessionTokenFromCookieHeader(cookieHeader);

  if (token) {
    const appSession = (prisma as {
      appSession?: {
        delete: (args: unknown) => Promise<unknown>;
      };
    }).appSession;

    if (appSession) {
      await appSession.delete({ where: { token } }).catch(() => null);
    } else {
      await prisma.$executeRaw`DELETE FROM "AppSession" WHERE "token" = ${token}`;
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
