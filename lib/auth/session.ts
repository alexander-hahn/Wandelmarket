import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCollectedBountiesForUser } from "@/lib/appUserBounties";

export const SESSION_COOKIE_NAME = "wandelshop_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  collectedBounties: number;
}

export async function createSessionForUser(userId: string) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const appSession = (prisma as {
    appSession?: { create: (args: unknown) => Promise<unknown> };
  }).appSession;

  if (appSession) {
    await appSession.create({
      data: { token, userId, expiresAt },
    });

    return { token, expiresAt };
  }

  await prisma.$executeRaw`
    INSERT INTO "AppSession" ("token", "userId", "expiresAt", "createdAt")
    VALUES (${token}, ${userId}, ${expiresAt}, ${new Date()})
  `;

  return { token, expiresAt };
}

export async function getSessionUserByToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;

  const now = new Date();

  const appSession = (prisma as {
    appSession?: {
      findUnique: (args: unknown) => Promise<{ userId: string; expiresAt: Date } | null>;
      delete: (args: unknown) => Promise<unknown>;
    };
    appUser?: {
      findUnique: (args: unknown) => Promise<SessionUser | null>;
    };
  });

  if (appSession.appSession && appSession.appUser) {
    const session = await appSession.appSession.findUnique({ where: { token } });
    if (!session) return null;

    if (session.expiresAt <= now) {
      await appSession.appSession.delete({ where: { token } }).catch(() => null);
      return null;
    }

    const user = await appSession.appUser.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!user) return null;

    const collectedBounties = await getCollectedBountiesForUser(session.userId);
    return { ...user, collectedBounties };
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      role: string;
      expiresAt: Date;
    }>
  >`
    SELECT u."id", u."displayName", u."firstName", u."lastName", u."email", u."role", s."expiresAt"
    FROM "AppSession" s
    JOIN "AppUser" u ON u."id" = s."userId"
    WHERE s."token" = ${token}
    LIMIT 1
  `;

  const row = rows[0] ?? null;
  if (!row) return null;

  if (row.expiresAt <= now) {
    await prisma.$executeRaw`DELETE FROM "AppSession" WHERE "token" = ${token}`;
    return null;
  }

  return {
    id: row.id,
    displayName: row.displayName,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
    collectedBounties: await getCollectedBountiesForUser(row.id),
  };
}
