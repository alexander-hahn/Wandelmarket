import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;

  const listingSubmission = (prisma as {
    listingSubmission?: {
      findUnique: (args: unknown) => Promise<{
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
        visibility: string;
        status: string;
      } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  }).listingSubmission;

  if (listingSubmission) {
    const submission = await listingSubmission.findUnique({ where: { id } });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    if (submission.status !== "pending") {
      return NextResponse.json({ error: "Submission already processed" }, { status: 400 });
    }

    const item = await prisma.shopItem.create({
      data: {
        name: submission.name,
        description: submission.description,
        category: submission.category,
        author: submission.author,
        version: submission.version || undefined,
        downloadUrl: submission.downloadUrl || undefined,
        repoUrl: submission.repoUrl || undefined,
        websiteUrl: submission.websiteUrl || undefined,
        thumbnailUrl: submission.thumbnailUrl || undefined,
        tags: submission.tags || "[]",
        installInstructions: submission.installInstructions || undefined,
        compatibilityOs: submission.compatibilityOs || "[]",
        compatibilityAppVersions: submission.compatibilityAppVersions || "[]",
        compatibilityToolchain: submission.compatibilityToolchain || "[]",
        visibility: submission.visibility || "members",
        source: "manual",
      },
    });

    if ((submission.visibility || "members") === "teams") {
      const submissionTeams = await prisma.$queryRaw<Array<{ teamId: string }>>`
        SELECT "teamId"
        FROM "ListingSubmissionTeam"
        WHERE "submissionId" = ${id}
      `;

      for (const team of submissionTeams) {
        await prisma.$executeRaw`
          INSERT OR IGNORE INTO "ShopItemTeam" ("itemId", "teamId", "createdAt")
          VALUES (${item.id}, ${team.teamId}, ${new Date()})
        `;
      }
    }

    const updated = await listingSubmission.update({
      where: { id },
      data: {
        status: "approved",
        approvedByUserId: auth.user.id,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({ submission: updated, item });
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
      visibility: string;
      status: string;
    }>
  >`SELECT * FROM "ListingSubmission" WHERE "id" = ${id} LIMIT 1`;

  const submission = rows[0] ?? null;
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (submission.status !== "pending") {
    return NextResponse.json({ error: "Submission already processed" }, { status: 400 });
  }

  const item = await prisma.shopItem.create({
    data: {
      name: submission.name,
      description: submission.description,
      category: submission.category,
      author: submission.author,
      version: submission.version || undefined,
      downloadUrl: submission.downloadUrl || undefined,
      repoUrl: submission.repoUrl || undefined,
      websiteUrl: submission.websiteUrl || undefined,
      thumbnailUrl: submission.thumbnailUrl || undefined,
      tags: submission.tags || "[]",
      installInstructions: submission.installInstructions || undefined,
      compatibilityOs: submission.compatibilityOs || "[]",
      compatibilityAppVersions: submission.compatibilityAppVersions || "[]",
      compatibilityToolchain: submission.compatibilityToolchain || "[]",
      visibility: submission.visibility || "members",
      source: "manual",
    },
  });

  if ((submission.visibility || "members") === "teams") {
    const submissionTeams = await prisma.$queryRaw<Array<{ teamId: string }>>`
      SELECT "teamId"
      FROM "ListingSubmissionTeam"
      WHERE "submissionId" = ${id}
    `;

    for (const team of submissionTeams) {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO "ShopItemTeam" ("itemId", "teamId", "createdAt")
        VALUES (${item.id}, ${team.teamId}, ${new Date()})
      `;
    }
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "ListingSubmission"
    SET "status" = ${"approved"}, "approvedByUserId" = ${auth.user.id}, "approvedAt" = ${now}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

  const updatedRows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status" FROM "ListingSubmission" WHERE "id" = ${id} LIMIT 1
  `;

  return NextResponse.json({ submission: updatedRows[0] ?? null, item });
}
