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
  { params }: { params: Promise<{ approvalTaskId: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { approvalTaskId } = await params;

  try {
    // Get the approval task
    const approvalTaskRows = await prisma.$queryRaw<
      Array<{
        id: string;
        bountyId: string;
        itemId: string;
        approverUserId: string;
        status: string;
      }>
    >`
      SELECT "id", "bountyId", "itemId", "approverUserId", "status"
      FROM "BountyApprovalTask"
      WHERE "id" = ${approvalTaskId}
      LIMIT 1
    `;

    const approvalTask = approvalTaskRows[0];
    if (!approvalTask) {
      return NextResponse.json({ error: "Approval task not found" }, { status: 404 });
    }

    // Verify the current user is the approver
    if (auth.user.id !== approvalTask.approverUserId) {
      return NextResponse.json(
        { error: "Only the bounty requester can approve this task" },
        { status: 403 }
      );
    }

    if (approvalTask.status !== "pending") {
      return NextResponse.json(
        { error: `Task is already ${approvalTask.status}` },
        { status: 400 }
      );
    }

    const now = new Date();

    // Check if this is a bounty submission or a direct conversion
    const submissionRows = await prisma.$queryRaw<
      Array<{
        id: string;
        bountyId: string;
        collectorId: string;
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
      }>
    >`
      SELECT * FROM "BountySubmission"
      WHERE "id" = ${approvalTask.itemId}
      LIMIT 1
    `;

    const submission = submissionRows[0];

    // Update approval task to approved
    await prisma.$executeRaw`
      UPDATE "BountyApprovalTask"
      SET "status" = ${"approved"}, "approvedAt" = ${now}, "updatedAt" = ${now}
      WHERE "id" = ${approvalTaskId}
    `;

    // Create publishing task for admins
    const publishingTaskId = generateId();
    await prisma.$executeRaw`
      INSERT INTO "BountyPublishingTask" ("id", "bountyId", "approvalTaskId", "itemId", "status", "createdAt", "updatedAt")
      VALUES (${publishingTaskId}, ${approvalTask.bountyId}, ${approvalTaskId}, ${approvalTask.itemId}, ${"pending"}, ${now}, ${now})
    `;

    // If this is a bounty submission, update it as approved
    if (submission) {
      await prisma.$executeRaw`
        UPDATE "BountySubmission"
        SET "approvedByBountyRequester" = true, "approvalTaskId" = ${approvalTaskId}, "publishingTaskId" = ${publishingTaskId}, "status" = ${"approved"}, "updatedAt" = ${now}
        WHERE "id" = ${approvalTask.itemId}
      `;
    }

    return NextResponse.json({
      message: "Item approved. Publishing task created for admins.",
      publishingTaskId,
    });
  } catch (error) {
    console.error("Error approving bounty item:", error);
    return NextResponse.json(
      { error: "Failed to approve bounty item" },
      { status: 500 }
    );
  }
}

