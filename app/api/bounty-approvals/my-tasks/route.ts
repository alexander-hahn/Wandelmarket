import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all approval tasks where this user is the approver
    const approvalTasks = await prisma.$queryRaw<
      Array<{
        id: string;
        bountyId: string;
        itemId: string;
        collectorId: string;
        status: string;
        createdAt: Date;
      }>
    >`
      SELECT "id", "bountyId", "itemId", "collectorId", "status", "createdAt"
      FROM "BountyApprovalTask"
      WHERE "approverUserId" = ${user.id}
      ORDER BY "createdAt" DESC
    `;

    // Enrich with bounty, item/submission data
    const enrichedTasks = await Promise.all(
      approvalTasks.map(async (task) => {
        const bountyRows = await prisma.$queryRaw<
          Array<{ title: string }>
        >`
          SELECT "title"
          FROM "BountyRequest"
          WHERE "id" = ${task.bountyId}
          LIMIT 1
        `;

        // Check if itemId refers to a BountySubmission or ShopItem
        const submissionRows = await prisma.$queryRaw<
          Array<{ name: string; category: string; description: string }>
        >`
          SELECT "name", "category", "description"
          FROM "BountySubmission"
          WHERE "id" = ${task.itemId}
          LIMIT 1
        `;

        let itemName = "Unknown";
        let itemDetails = "";

        if (submissionRows.length > 0) {
          const submission = submissionRows[0];
          itemName = submission.name;
          itemDetails = `Category: ${submission.category}`;
        } else {
          const itemRows = await prisma.$queryRaw<
            Array<{ name: string }>
          >`
            SELECT "name"
            FROM "ShopItem"
            WHERE "id" = ${task.itemId}
            LIMIT 1
          `;
          if (itemRows.length > 0) {
            itemName = itemRows[0].name;
          }
        }

        return {
          id: task.id,
          bountyId: task.bountyId,
          itemId: task.itemId,
          collectorId: task.collectorId,
          status: task.status,
          createdAt: task.createdAt.toISOString(),
          bountyTitle: bountyRows[0]?.title || "Unknown",
          itemName,
          itemDetails,
          taskType: "approval" as const,
        };
      })
    );

    return NextResponse.json(enrichedTasks);
  } catch (error) {
    console.error("Error fetching approval tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
