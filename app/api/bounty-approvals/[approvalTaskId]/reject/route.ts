import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

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
        { error: "Only the bounty requester can reject this task" },
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

    // Update approval task to rejected
    await prisma.$executeRaw`
      UPDATE "BountyApprovalTask"
      SET "status" = ${"rejected"}, "approvedAt" = ${now}, "updatedAt" = ${now}
      WHERE "id" = ${approvalTaskId}
    `;

    // Revert bounty status back to open
    await prisma.$executeRaw`
      UPDATE "BountyRequest"
      SET "status" = ${"open"}, "convertedItemId" = NULL, "updatedAt" = ${now}
      WHERE "id" = ${approvalTask.bountyId}
    `;

    return NextResponse.json({
      message: "Item rejected. Bounty reopened for new submissions.",
    });
  } catch (error) {
    console.error("Error rejecting bounty item:", error);
    return NextResponse.json(
      { error: "Failed to reject bounty item" },
      { status: 500 }
    );
  }
}
