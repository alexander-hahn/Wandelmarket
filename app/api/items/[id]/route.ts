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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const { id } = await params;
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
    compatibilityOs,
    compatibilityAppVersions,
    compatibilityToolchain,
    visibility,
    teamIds,
  } = body;

  const normalizedVisibility = visibility !== undefined ? normalizeVisibility(visibility) : undefined;
  const selectedTeamIds = teamIds !== undefined ? parseTeamIds(teamIds) : undefined;

  if (author !== undefined) {
    return NextResponse.json(
      { error: "author cannot be set directly; select a user from the author dropdown" },
      { status: 400 }
    );
  }

  let resolvedAuthor: string | undefined;
  if (authorUserId !== undefined) {
    const nextAuthor = await resolveAuthorByUserId(authorUserId);
    if (!nextAuthor) {
      return NextResponse.json({ error: "Selected author user not found" }, { status: 400 });
    }
    resolvedAuthor = nextAuthor;
  }

  const existing = await prisma.shopItem.findUnique({
    where: { id },
    select: { source: true, providerKey: true, visibility: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const isSyncedItem = existing.source !== "manual" || existing.providerKey !== null;

  if (isSyncedItem && (normalizedVisibility !== undefined || selectedTeamIds !== undefined)) {
    return NextResponse.json(
      { error: "Provider-synced listings are always visible to all members and cannot be assigned to teams" },
      { status: 400 }
    );
  }

  if (normalizedVisibility === "teams" && selectedTeamIds && selectedTeamIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one team when visibility is set to teams" },
      { status: 400 }
    );
  }

  const item = await prisma.shopItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(resolvedAuthor !== undefined && { author: resolvedAuthor }),
      ...(version !== undefined && { version }),
      ...(downloadUrl !== undefined && { downloadUrl }),
      ...(repoUrl !== undefined && { repoUrl }),
      ...(websiteUrl !== undefined && { websiteUrl }),
      ...(thumbnailUrl !== undefined && { thumbnailOverride: thumbnailUrl || null }),
      ...(tags !== undefined && { tags: JSON.stringify(Array.isArray(tags) ? tags : []) }),
      ...(installInstructions !== undefined && { installInstructions }),
      ...(compatibilityOs !== undefined && {
        compatibilityOs: JSON.stringify(Array.isArray(compatibilityOs) ? compatibilityOs : []),
      }),
      ...(compatibilityAppVersions !== undefined && {
        compatibilityAppVersions: JSON.stringify(
          Array.isArray(compatibilityAppVersions) ? compatibilityAppVersions : []
        ),
      }),
      ...(compatibilityToolchain !== undefined && {
        compatibilityToolchain: JSON.stringify(
          Array.isArray(compatibilityToolchain) ? compatibilityToolchain : []
        ),
      }),
      ...(normalizedVisibility !== undefined && { visibility: normalizedVisibility }),
    },
  });

  if (normalizedVisibility !== undefined || selectedTeamIds !== undefined) {
    const effectiveVisibility = normalizedVisibility ?? item.visibility;
    const effectiveTeamIds = selectedTeamIds ?? [];

    await prisma.$executeRaw`DELETE FROM "ShopItemTeam" WHERE "itemId" = ${id}`;

    if (effectiveVisibility === "teams") {
      for (const teamId of effectiveTeamIds) {
        await prisma.$executeRaw`
          INSERT OR IGNORE INTO "ShopItemTeam" ("itemId", "teamId", "createdAt")
          VALUES (${id}, ${teamId}, ${new Date()})
        `;
      }
    }
  }

  return NextResponse.json(item);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const { id } = await params;

  // Keep bounty history consistent when a converted listing is removed.
  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET "status" = ${"deleted"}, "convertedItemId" = ${null}, "updatedAt" = ${new Date()}
    WHERE "convertedItemId" = ${id}
  `;

  await prisma.shopItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
