import Container from "@mui/material/Container";
import { prisma } from "@/lib/db";
import BrowseGrid from "@/components/BrowseGrid";
import { cookies } from "next/headers";
import { getSessionUserByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; team?: string }>;
}) {
  const { category, team } = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
  const user = token ? await getSessionUserByToken(token) : null;

  const userTeams = user
    ? await prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
        SELECT t."id", t."name", t."slug"
        FROM "AppUserTeam" ut
        INNER JOIN "Team" t ON t."id" = ut."teamId"
        WHERE ut."userId" = ${user.id} AND t."status" = ${"approved"}
        ORDER BY t."name" ASC
      `
    : [];

  const selectedTeam = team && userTeams.some((entry) => entry.slug === team) ? team : "all";

  const teamFilterSql = selectedTeam !== "all"
    ? prisma.$queryRaw<Array<{ id: string }>>`
        SELECT i."id"
        FROM "ShopItem" i
        INNER JOIN "ShopItemTeam" it ON it."itemId" = i."id"
        INNER JOIN "Team" t ON t."id" = it."teamId"
        WHERE t."slug" = ${selectedTeam}
      `
    : Promise.resolve<Array<{ id: string }>>([]);

  const teamFilteredItemIds = new Set((await teamFilterSql).map((row) => row.id));

  const items = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      author: string;
      version: string | null;
      downloadUrl: string | null;
      repoUrl: string | null;
      websiteUrl: string | null;
      thumbnailUrl: string | null;
      thumbnailOverride: string | null;
      tags: string;
      source: string;
      providerKey: string | null;
      stars: number;
      installInstructions: string | null;
      compatibilityOs: string;
      compatibilityAppVersions: string;
      compatibilityToolchain: string;
      visibility: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT i.*
    FROM "ShopItem" i
    WHERE (
      i."visibility" = ${"members"}
      OR (
        i."visibility" = ${"teams"}
        AND EXISTS (
          SELECT 1
          FROM "ShopItemTeam" it
          INNER JOIN "AppUserTeam" ut ON ut."teamId" = it."teamId"
          INNER JOIN "Team" t ON t."id" = it."teamId"
          WHERE it."itemId" = i."id"
            AND ut."userId" = ${user?.id ?? ""}
            AND t."status" = ${"approved"}
        )
      )
    )
    ORDER BY i."stars" DESC, i."createdAt" DESC
  `;

  const visibilityFilteredItems = selectedTeam === "all"
    ? items
    : items.filter((item) => teamFilteredItemIds.has(item.id));

  const normalizedItems = visibilityFilteredItems.map((item) => ({
    ...item,
    tags: item.tags || "[]",
  }));

  // Count per category for sidebar badges
  const counts: Record<string, number> = { all: normalizedItems.length };
  for (const item of normalizedItems) {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  }

  const announcements = await prisma.$queryRaw<Array<{ id: string; title: string; message: string; updatedAt: Date }>>`
    SELECT "id", "title", "message", "updatedAt"
    FROM "Announcement"
    WHERE "target" = ${"wandelmarket"} AND "enabled" = ${1}
    ORDER BY "createdAt" DESC
  `;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <BrowseGrid
        items={normalizedItems}
        initialCategory={category ?? "all"}
        counts={counts}
        announcements={announcements}
      />
    </Container>
  );
}
