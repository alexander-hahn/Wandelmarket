import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { normalizeVisibility, parseTeamIds } from "@/lib/teams";

async function resolveAuthorByUserId(userId: unknown): Promise<string | null> {
  if (typeof userId !== "string" || !userId.trim()) return null;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>
  >`
    SELECT "id", "displayName", "firstName", "lastName", "email"
    FROM "AppUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  const user = rows[0] ?? null;
  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.displayName?.trim() || fullName || user.email?.trim() || user.id;
}

export async function GET() {
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
      visibility: string;
      createdAt: Date;
      updatedAt: Date;
      teamIds: string;
      teamNames: string;
    }>
  >`
    SELECT
      i.*,
      COALESCE((
        SELECT json_group_array(it."teamId")
        FROM "ShopItemTeam" it
        INNER JOIN "Team" t ON t."id" = it."teamId"
        WHERE it."itemId" = i."id" AND t."status" = ${"approved"}
      ), '[]') as "teamIds",
      COALESCE((
        SELECT json_group_array(t."name")
        FROM "ShopItemTeam" it
        INNER JOIN "Team" t ON t."id" = it."teamId"
        WHERE it."itemId" = i."id" AND t."status" = ${"approved"}
      ), '[]') as "teamNames"
    FROM "ShopItem" i
    ORDER BY i."createdAt" DESC
  `;

  return NextResponse.json(
    items.map((item) => ({
      ...item,
      teamIds: JSON.parse(item.teamIds || "[]"),
      teamNames: JSON.parse(item.teamNames || "[]"),
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const body = await req.json();

  const {
    name,
    description,
    category,
    author,
    authorUserId,
    version,
    downloadUrl,
    repoUrl,
    websiteUrl,
    thumbnailUrl,
    tags,
    installInstructions,
    visibility,
    teamIds,
  } = body;

  if (author !== undefined) {
    return NextResponse.json(
      { error: "author cannot be set directly; select a user from the author dropdown" },
      { status: 400 }
    );
  }

  if (!name || !description || !category || !authorUserId) {
    return NextResponse.json(
      { error: "name, description, category and author user are required" },
      { status: 400 }
    );
  }

  const resolvedAuthor = await resolveAuthorByUserId(authorUserId);
  if (!resolvedAuthor) {
    return NextResponse.json({ error: "Selected author user not found" }, { status: 400 });
  }

  const normalizedVisibility = normalizeVisibility(visibility);
  const selectedTeamIds = parseTeamIds(teamIds);

  if (normalizedVisibility === "teams" && selectedTeamIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one team when visibility is set to teams" },
      { status: 400 }
    );
  }

  const item = await prisma.shopItem.create({
    data: {
      name,
      description,
      category,
      author: resolvedAuthor,
      version: version || undefined,
      downloadUrl: downloadUrl || undefined,
      repoUrl: repoUrl || undefined,
      websiteUrl: websiteUrl || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      tags: JSON.stringify(Array.isArray(tags) ? tags : []),
      installInstructions: installInstructions || undefined,
      visibility: normalizedVisibility,
      source: "manual",
    },
  });

  if (normalizedVisibility === "teams") {
    for (const teamId of selectedTeamIds) {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO "ShopItemTeam" ("itemId", "teamId", "createdAt")
        VALUES (${item.id}, ${teamId}, ${new Date()})
      `;
    }
  }

  return NextResponse.json(item, { status: 201 });
}
