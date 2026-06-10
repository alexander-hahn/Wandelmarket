import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const APP_ROLES = ["member", "moderator", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface RequestUser {
  id: string;
  displayName: string | null;
  role: AppRole;
}

function normalizeRole(value: string | null | undefined): AppRole {
  if (value === "admin" || value === "moderator") return value;
  return "member";
}

function extractUserId(req: Request): string | null {
  const userId = req.headers.get("x-user-id")?.trim();
  return userId && userId.length > 0 ? userId : null;
}

function extractDisplayName(req: Request): string | null {
  const displayName = req.headers.get("x-user-name")?.trim();
  return displayName && displayName.length > 0 ? displayName : null;
}

function extractSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const sessionPart = parts.find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionPart) return null;

  const token = sessionPart.slice(`${SESSION_COOKIE_NAME}=`.length).trim();
  return token ? decodeURIComponent(token) : null;
}

function isConfiguredAdmin(userId: string): boolean {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  const adminIds = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return adminIds.includes(userId);
}

async function defaultRoleForNewUser(userId: string): Promise<AppRole> {
  if (isConfiguredAdmin(userId)) return "admin";

  const appUser = (prisma as {
    appUser?: { count: () => Promise<number> };
  }).appUser;

  if (appUser) {
    const userCount = await appUser.count();
    return userCount === 0 ? "admin" : "member";
  }

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT CAST(COUNT(*) AS INT) as "count"
    FROM "AppUser"
  `;

  const userCount = rows[0]?.count ?? 0;
  return userCount === 0 ? "admin" : "member";
}

export async function resolveRequestUser(req: Request): Promise<RequestUser | null> {
  const userId = extractUserId(req);

  if (!userId) {
    const sessionToken = extractSessionToken(req);
    if (!sessionToken) return null;

    const sessionUser = await getSessionUserByToken(sessionToken);
    if (!sessionUser) return null;

    return {
      id: sessionUser.id,
      displayName: sessionUser.displayName,
      role: normalizeRole(sessionUser.role),
    };
  }

  const displayName = extractDisplayName(req);

  const appUser = (prisma as {
    appUser?: {
      findUnique: (args: unknown) => Promise<RequestUser | null>;
      create: (args: unknown) => Promise<RequestUser>;
      update: (args: unknown) => Promise<RequestUser>;
    };
  }).appUser;

  if (appUser) {
    const existing = await appUser.findUnique({ where: { id: userId } });

    if (existing) {
      if (displayName && existing.displayName !== displayName) {
        return appUser.update({
          where: { id: userId },
          data: { displayName },
        });
      }
      return {
        id: existing.id,
        displayName: existing.displayName,
        role: normalizeRole(existing.role),
      };
    }

    const role = await defaultRoleForNewUser(userId);
    return appUser.create({
      data: {
        id: userId,
        displayName,
        role,
      },
    });
  }

  const existingRows = await prisma.$queryRaw<
    Array<{
      id: string;
      displayName: string | null;
      role: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT "id", "displayName", "role", "createdAt", "updatedAt"
    FROM "AppUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  const existing = existingRows[0] ?? null;

  if (existing) {
    if (displayName && existing.displayName !== displayName) {
      const now = new Date();
      await prisma.$executeRaw`
        UPDATE "AppUser"
        SET "displayName" = ${displayName}, "updatedAt" = ${now}
        WHERE "id" = ${userId}
      `;
      return { id: existing.id, displayName, role: normalizeRole(existing.role) };
    }

    return {
      id: existing.id,
      displayName: existing.displayName,
      role: normalizeRole(existing.role),
    };
  }

  const role = await defaultRoleForNewUser(userId);
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "AppUser" ("id", "displayName", "role", "createdAt", "updatedAt")
    VALUES (${userId}, ${displayName}, ${role}, ${now}, ${now})
  `;

  return {
    id: userId,
    displayName,
    role,
  };
}

export async function requireRoles(req: Request, allowedRoles: AppRole[]) {
  const user = await resolveRequestUser(req);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Missing user identity." },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user,
      response: NextResponse.json(
        { error: `Role ${user.role} is not allowed for this action.` },
        { status: 403 }
      ),
    };
  }

  return { user };
}
