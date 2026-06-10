import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeVisibility, parseTeamIds } from "@/lib/teams";

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getAllowedTeamIdSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ teamId: string }>>`
    SELECT ut."teamId"
    FROM "AppUserTeam" ut
    INNER JOIN "Team" t ON t."id" = ut."teamId"
    WHERE ut."userId" = ${userId} AND t."status" = ${"approved"}
  `;
  return new Set(rows.map((row) => row.teamId));
}

async function resolveIdentitySet(userId: string, displayName?: string | null): Promise<Set<string>> {
  const userRows = await prisma.$queryRaw<
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

  const profile = userRows[0] ?? null;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();

  return new Set(
    [
      userId,
      displayName ?? "",
      profile?.displayName ?? "",
      profile?.email ?? "",
      fullName,
    ]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;

  const submissionRows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      version: string | null;
      downloadUrl: string | null;
      repoUrl: string | null;
      websiteUrl: string | null;
      thumbnailUrl: string | null;
      tags: string;
      installInstructions: string | null;
      compatibilityOs: string;
      compatibilityAppVersions: string;
      compatibilityToolchain: string;
      visibility: string;
    }>
  >`
    SELECT "id", "name", "description", "category", "version", "downloadUrl", "repoUrl", "websiteUrl", "thumbnailUrl", "tags", "installInstructions", "compatibilityOs", "compatibilityAppVersions", "compatibilityToolchain", "visibility"
    FROM "ListingSubmission"
    WHERE "id" = ${id} AND "submittedByUserId" = ${auth.user.id}
    LIMIT 1
  `;

  const submission = submissionRows[0] ?? null;
  if (submission) {
    const teamRows = await prisma.$queryRaw<Array<{ teamId: string }>>`
      SELECT "teamId"
      FROM "ListingSubmissionTeam"
      WHERE "submissionId" = ${id}
    `;

    return NextResponse.json({
      id: submission.id,
      source: "submission",
      name: submission.name,
      description: submission.description,
      category: submission.category,
      version: submission.version,
      downloadUrl: submission.downloadUrl,
      repoUrl: submission.repoUrl,
      websiteUrl: submission.websiteUrl,
      thumbnailUrl: submission.thumbnailUrl,
      tags: parseTags(submission.tags),
      installInstructions: submission.installInstructions,
      compatibilityOs: parseStringArray(submission.compatibilityOs),
      compatibilityAppVersions: parseStringArray(submission.compatibilityAppVersions),
      compatibilityToolchain: parseStringArray(submission.compatibilityToolchain),
      visibility: normalizeVisibility(submission.visibility),
      teamIds: teamRows.map((row) => row.teamId),
    });
  }

  const item = await prisma.shopItem.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      author: true,
      version: true,
      downloadUrl: true,
      repoUrl: true,
      websiteUrl: true,
      thumbnailOverride: true,
      thumbnailUrl: true,
      tags: true,
      installInstructions: true,
      compatibilityOs: true,
      compatibilityAppVersions: true,
      compatibilityToolchain: true,
      visibility: true,
    },
  });

  if (!item) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const identitySet = await resolveIdentitySet(auth.user.id, auth.user.displayName);
  if (!identitySet.has(item.author.trim().toLowerCase())) {
    return NextResponse.json({ error: "Not allowed to edit this listing" }, { status: 403 });
  }

  const teamRows = await prisma.$queryRaw<Array<{ teamId: string }>>`
    SELECT "teamId"
    FROM "ShopItemTeam"
    WHERE "itemId" = ${id}
  `;

  return NextResponse.json({
    id: item.id,
    source: "published",
    name: item.name,
    description: item.description,
    category: item.category,
    version: item.version,
    downloadUrl: item.downloadUrl,
    repoUrl: item.repoUrl,
    websiteUrl: item.websiteUrl,
    thumbnailUrl: item.thumbnailOverride || item.thumbnailUrl,
    tags: parseTags(item.tags),
    installInstructions: item.installInstructions,
    compatibilityOs: parseStringArray(item.compatibilityOs),
    compatibilityAppVersions: parseStringArray(item.compatibilityAppVersions),
    compatibilityToolchain: parseStringArray(item.compatibilityToolchain),
    visibility: normalizeVisibility(item.visibility),
    teamIds: teamRows.map((row) => row.teamId),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const {
    name,
    description,
    category,
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
  } = body as {
    name?: string;
    description?: string;
    category?: string;
    version?: unknown;
    downloadUrl?: unknown;
    repoUrl?: unknown;
    websiteUrl?: unknown;
    thumbnailUrl?: unknown;
    tags?: unknown;
    installInstructions?: unknown;
    compatibilityOs?: unknown;
    compatibilityAppVersions?: unknown;
    compatibilityToolchain?: unknown;
    visibility?: unknown;
    teamIds?: unknown;
  };

  if (!name || !description || !category) {
    return NextResponse.json({ error: "name, description and category are required" }, { status: 400 });
  }

  const normalizedVisibility = normalizeVisibility(visibility);
  const selectedTeamIds = parseTeamIds(teamIds);

  if (normalizedVisibility === "teams" && selectedTeamIds.length === 0) {
    return NextResponse.json({ error: "Select at least one team for team visibility" }, { status: 400 });
  }

  const allowedTeamIds = await getAllowedTeamIdSet(auth.user.id);
  if (normalizedVisibility === "teams") {
    const hasInvalid = selectedTeamIds.some((teamId) => !allowedTeamIds.has(teamId));
    if (hasInvalid) {
      return NextResponse.json({ error: "You can only target teams you are assigned to" }, { status: 403 });
    }
  }

  const derivedAuthor = auth.user.displayName?.trim() || auth.user.id;
  const safeTags = JSON.stringify(Array.isArray(tags) ? tags : []);
  const safeCompatibilityOs = JSON.stringify(Array.isArray(compatibilityOs) ? compatibilityOs : []);
  const safeCompatibilityAppVersions = JSON.stringify(
    Array.isArray(compatibilityAppVersions) ? compatibilityAppVersions : []
  );
  const safeCompatibilityToolchain = JSON.stringify(
    Array.isArray(compatibilityToolchain) ? compatibilityToolchain : []
  );
  const now = new Date();

  const submissionRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ListingSubmission"
    WHERE "id" = ${id} AND "submittedByUserId" = ${auth.user.id}
    LIMIT 1
  `;

  if (submissionRows[0]) {
    await prisma.$executeRaw`
      UPDATE "ListingSubmission"
      SET
        "name" = ${name},
        "description" = ${description},
        "category" = ${category},
        "author" = ${derivedAuthor},
        "version" = ${normalizeOptionalString(version)},
        "downloadUrl" = ${normalizeOptionalString(downloadUrl)},
        "repoUrl" = ${normalizeOptionalString(repoUrl)},
        "websiteUrl" = ${normalizeOptionalString(websiteUrl)},
        "thumbnailUrl" = ${normalizeOptionalString(thumbnailUrl)},
        "tags" = ${safeTags},
        "installInstructions" = ${normalizeOptionalString(installInstructions)},
        "compatibilityOs" = ${safeCompatibilityOs},
        "compatibilityAppVersions" = ${safeCompatibilityAppVersions},
        "compatibilityToolchain" = ${safeCompatibilityToolchain},
        "visibility" = ${normalizedVisibility},
        "status" = ${"pending"},
        "approvedByUserId" = ${null},
        "approvedAt" = ${null},
        "updatedAt" = ${now}
      WHERE "id" = ${id}
    `;

    await prisma.$executeRaw`DELETE FROM "ListingSubmissionTeam" WHERE "submissionId" = ${id}`;
    if (normalizedVisibility === "teams") {
      for (const teamId of selectedTeamIds) {
        await prisma.$executeRaw`
          INSERT OR IGNORE INTO "ListingSubmissionTeam" ("submissionId", "teamId", "createdAt")
          VALUES (${id}, ${teamId}, ${new Date()})
        `;
      }
    }

    return NextResponse.json({ ok: true, source: "submission" });
  }

  const item = await prisma.shopItem.findUnique({
    where: { id },
    select: { id: true, author: true, source: true, providerKey: true },
  });

  if (!item) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const identitySet = await resolveIdentitySet(auth.user.id, auth.user.displayName);
  if (!identitySet.has(item.author.trim().toLowerCase())) {
    return NextResponse.json({ error: "Not allowed to edit this listing" }, { status: 403 });
  }

  const isSyncedItem = item.source !== "manual" || item.providerKey !== null;
  if (isSyncedItem) {
    return NextResponse.json(
      { error: "Provider-synced listings cannot be edited from the user form" },
      { status: 400 }
    );
  }

  await prisma.shopItem.update({
    where: { id },
    data: {
      name,
      description,
      category,
      author: derivedAuthor,
      version: normalizeOptionalString(version),
      downloadUrl: normalizeOptionalString(downloadUrl),
      repoUrl: normalizeOptionalString(repoUrl),
      websiteUrl: normalizeOptionalString(websiteUrl),
      thumbnailOverride: normalizeOptionalString(thumbnailUrl),
      tags: safeTags,
      installInstructions: normalizeOptionalString(installInstructions),
      compatibilityOs: safeCompatibilityOs,
      compatibilityAppVersions: safeCompatibilityAppVersions,
      compatibilityToolchain: safeCompatibilityToolchain,
      visibility: normalizedVisibility,
    },
  });

  await prisma.$executeRaw`DELETE FROM "ShopItemTeam" WHERE "itemId" = ${id}`;
  if (normalizedVisibility === "teams") {
    for (const teamId of selectedTeamIds) {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO "ShopItemTeam" ("itemId", "teamId", "createdAt")
        VALUES (${id}, ${teamId}, ${new Date()})
      `;
    }
  }

  return NextResponse.json({ ok: true, source: "published" });
}