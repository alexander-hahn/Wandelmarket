import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

function generateId(): string {
  return Array.from({ length: 16 })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const collectorId = auth.user.id;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";

  if (!name || !description || !category) {
    return NextResponse.json(
      { error: "Name, description, and category are required" },
      { status: 400 }
    );
  }

  try {
    // Get the bounty
    const bountyRows = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        description: string;
        requester: string;
        status: string;
      }>
    >`
      SELECT "id", "title", "description", "requester", "status"
      FROM "BountyRequest"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const bounty = bountyRows[0];
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    if (bounty.status === "collected" || bounty.status === "converted") {
      return NextResponse.json(
        { error: "This bounty has already been collected" },
        { status: 400 }
      );
    }

    // Record the collection
    try {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO "BountyCollect" ("id", "bountyId", "collectorId", "createdAt")
        VALUES (lower(hex(randomblob(16))), ${id}, ${collectorId}, ${new Date()})
      `;
    } catch {
      // Ignore if table doesn't exist
    }

    // Create the bounty submission
    const submissionId = generateId();
    const now = new Date();

    const tags = Array.isArray(body.tags) ? body.tags : [];
    const compatibilityOs = Array.isArray(body.compatibilityOs) ? body.compatibilityOs : [];
    const compatibilityAppVersions = Array.isArray(body.compatibilityAppVersions)
      ? body.compatibilityAppVersions
      : [];
    const compatibilityToolchain = Array.isArray(body.compatibilityToolchain)
      ? body.compatibilityToolchain
      : [];

    await prisma.$executeRaw`
      INSERT INTO "BountySubmission" (
        "id", "bountyId", "collectorId", "name", "description", "category",
        "version", "downloadUrl", "repoUrl", "websiteUrl", "thumbnailUrl",
        "tags", "installInstructions",
        "compatibilityOs", "compatibilityAppVersions", "compatibilityToolchain",
        "status", "createdAt", "updatedAt"
      ) VALUES (
        ${submissionId},
        ${id},
        ${collectorId},
        ${name},
        ${description},
        ${category},
        ${typeof body.version === "string" ? body.version : null},
        ${typeof body.downloadUrl === "string" ? body.downloadUrl : null},
        ${typeof body.repoUrl === "string" ? body.repoUrl : null},
        ${typeof body.websiteUrl === "string" ? body.websiteUrl : null},
        ${typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null},
        ${JSON.stringify(tags)},
        ${typeof body.installInstructions === "string" ? body.installInstructions : null},
        ${JSON.stringify(compatibilityOs)},
        ${JSON.stringify(compatibilityAppVersions)},
        ${JSON.stringify(compatibilityToolchain)},
        ${"pending"},
        ${now},
        ${now}
      )
    `;

    // Create approval task for bounty requester
    const approvalTaskId = generateId();
    await prisma.$executeRaw`
      INSERT INTO "BountyApprovalTask" (
        "id", "bountyId", "collectorId", "itemId", "approverUserId", "status", "createdAt", "updatedAt"
      ) VALUES (
        ${approvalTaskId},
        ${id},
        ${collectorId},
        ${submissionId},
        ${bounty.requester},
        ${"pending"},
        ${now},
        ${now}
      )
    `;

    // Update bounty status to pending
    if (bounty.status === "open") {
      await prisma.$executeRaw`
        UPDATE "BountyRequest"
        SET "status" = ${"pending"}, "updatedAt" = ${now}
        WHERE "id" = ${id}
      `;
    }

    return NextResponse.json({
      message: "Listing submitted for bounty. Awaiting approver review.",
      submissionId,
      approvalTaskId,
    });
  } catch (error) {
    console.error("Error submitting bounty collection:", error);
    return NextResponse.json(
      { error: "Failed to submit bounty collection" },
      { status: 500 }
    );
  }
}
