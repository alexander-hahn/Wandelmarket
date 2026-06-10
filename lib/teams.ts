import { prisma } from "@/lib/db";

export type ListingVisibility = "members" | "teams";

export function normalizeVisibility(value: unknown): ListingVisibility {
  return value === "teams" ? "teams" : "members";
}

export function parseTeamIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function slugifyTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function generateUniqueTeamSlug(
  nameOrSlug: string,
  excludeTeamId?: string
): Promise<string> {
  const baseSlug = slugifyTeamName(nameOrSlug) || "team";

  const existingRows = excludeTeamId
    ? await prisma.$queryRaw<Array<{ slug: string }>>`
        SELECT "slug"
        FROM "Team"
        WHERE "id" != ${excludeTeamId} AND "slug" LIKE ${`${baseSlug}%`}
      `
    : await prisma.$queryRaw<Array<{ slug: string }>>`
        SELECT "slug"
        FROM "Team"
        WHERE "slug" LIKE ${`${baseSlug}%`}
      `;

  const existing = new Set(existingRows.map((row) => row.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (counter < 10000) {
    const suffix = `-${counter}`;
    const candidate = `${baseSlug.slice(0, Math.max(1, 60 - suffix.length))}${suffix}`;
    if (!existing.has(candidate)) return candidate;
    counter += 1;
  }

  return `${baseSlug.slice(0, 55)}-${Date.now().toString().slice(-4)}`;
}

export async function getUserTeamIds(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ teamId: string }>>`
    SELECT "teamId"
    FROM "AppUserTeam"
    WHERE "userId" = ${userId}
  `;

  return rows.map((row) => row.teamId);
}

export async function getUserTeams(userId: string): Promise<Array<{ id: string; name: string; slug: string }>> {
  return prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
    SELECT t."id", t."name", t."slug"
    FROM "Team" t
    INNER JOIN "AppUserTeam" ut ON ut."teamId" = t."id"
    WHERE ut."userId" = ${userId} AND t."status" = ${"approved"}
    ORDER BY t."name" ASC
  `;
}

export async function getAllTeams(): Promise<Array<{ id: string; name: string; slug: string }>> {
  return prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
    SELECT "id", "name", "slug"
    FROM "Team"
    ORDER BY "name" ASC
  `;
}

export async function getTeamMembers(teamId: string): Promise<Array<{ userId: string; role: string }>> {
  return prisma.$queryRaw<Array<{ userId: string; role: string }>>`
    SELECT "userId", "role"
    FROM "AppUserTeam"
    WHERE "teamId" = ${teamId}
  `;
}
