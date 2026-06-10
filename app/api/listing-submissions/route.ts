import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { normalizeVisibility, parseTeamIds } from "@/lib/teams";

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response) return auth.response;

  const listingSubmission = (prisma as {
    listingSubmission?: {
      findMany: (args: unknown) => Promise<unknown>;
    };
  }).listingSubmission;

  if (listingSubmission) {
    const submissions = await listingSubmission.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(submissions);
  }

  const rows = await prisma.$queryRaw<
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
      tags: string;
      installInstructions: string | null;
      compatibilityOs: string;
      compatibilityAppVersions: string;
      compatibilityToolchain: string;
      submittedByUserId: string;
      status: string;
      approvedByUserId: string | null;
      approvedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`SELECT * FROM "ListingSubmission" WHERE "status" = ${"pending"} ORDER BY "createdAt" ASC`;

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

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
    version?: string;
    downloadUrl?: string;
    repoUrl?: string;
    websiteUrl?: string;
    thumbnailUrl?: string;
    tags?: unknown;
    installInstructions?: string;
    compatibilityOs?: unknown;
    compatibilityAppVersions?: unknown;
    compatibilityToolchain?: unknown;
    visibility?: string;
    teamIds?: unknown;
  };

  if (!name || !description || !category) {
    return NextResponse.json(
      { error: "name, description and category are required" },
      { status: 400 }
    );
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
  const normalizedVisibility = normalizeVisibility(visibility);
  const requestedTeamIds = parseTeamIds(teamIds);

  if (normalizedVisibility === "teams") {
    if (requestedTeamIds.length === 0) {
      return NextResponse.json({ error: "Select at least one team for team visibility" }, { status: 400 });
    }

    const allowedRows = await prisma.$queryRaw<Array<{ teamId: string }>>`
      SELECT ut."teamId"
      FROM "AppUserTeam" ut
      INNER JOIN "Team" t ON t."id" = ut."teamId"
      WHERE ut."userId" = ${auth.user.id} AND t."status" = ${"approved"}
    `;
    const allowedTeamIds = new Set(allowedRows.map((row) => row.teamId));
    const hasInvalid = requestedTeamIds.some((teamId) => !allowedTeamIds.has(teamId));
    if (hasInvalid) {
      return NextResponse.json({ error: "You can only target teams you are assigned to" }, { status: 403 });
    }
  }

  const listingSubmission = (prisma as {
    listingSubmission?: { create: (args: unknown) => Promise<unknown> };
  }).listingSubmission;

  if (listingSubmission) {
    const submission = await listingSubmission.create({
      data: {
        name,
        description,
        category,
        author: derivedAuthor,
        version: version || undefined,
        downloadUrl: downloadUrl || undefined,
        repoUrl: repoUrl || undefined,
        websiteUrl: websiteUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        tags: safeTags,
        installInstructions: installInstructions || undefined,
        compatibilityOs: safeCompatibilityOs,
        compatibilityAppVersions: safeCompatibilityAppVersions,
        compatibilityToolchain: safeCompatibilityToolchain,
        visibility: normalizedVisibility,
        submittedByUserId: auth.user.id,
        status: "pending",
      },
    });

    const createdSubmissionId = (submission as { id?: unknown })?.id;
    if (normalizedVisibility === "teams" && typeof createdSubmissionId === "string") {
      for (const teamId of requestedTeamIds) {
        await prisma.$executeRaw`
          INSERT OR IGNORE INTO "ListingSubmissionTeam" ("submissionId", "teamId", "createdAt")
          VALUES (${createdSubmissionId}, ${teamId}, ${new Date()})
        `;
      }
    }

    return NextResponse.json(submission, { status: 201 });
  }

  const now = new Date();
  const id = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "ListingSubmission"
      ("id", "name", "description", "category", "author", "version", "downloadUrl", "repoUrl", "websiteUrl", "thumbnailUrl", "tags", "installInstructions", "compatibilityOs", "compatibilityAppVersions", "compatibilityToolchain", "visibility", "submittedByUserId", "status", "createdAt", "updatedAt")
    VALUES
      (${id}, ${name}, ${description}, ${category}, ${derivedAuthor}, ${version || null}, ${downloadUrl || null}, ${repoUrl || null}, ${websiteUrl || null}, ${thumbnailUrl || null}, ${safeTags}, ${installInstructions || null}, ${safeCompatibilityOs}, ${safeCompatibilityAppVersions}, ${safeCompatibilityToolchain}, ${normalizedVisibility}, ${auth.user.id}, ${"pending"}, ${now}, ${now})
  `;

  if (normalizedVisibility === "teams") {
    for (const teamId of requestedTeamIds) {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO "ListingSubmissionTeam" ("submissionId", "teamId", "createdAt")
        VALUES (${id}, ${teamId}, ${new Date()})
      `;
    }
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "ListingSubmission" WHERE "id" = ${id} LIMIT 1
  `;

  return NextResponse.json(rows[0] ?? null, { status: 201 });
}
