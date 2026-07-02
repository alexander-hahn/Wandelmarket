import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response || !auth.user) return auth.response;

  try {
    // Get all publishing tasks (these are for admins/moderators)
    const publishingTasks = await prisma.$queryRaw<
      Array<{
        id: string;
        bountyId: string;
        approvalTaskId: string;
        itemId: string;
        status: string;
        createdAt: Date;
      }>
    >`
      SELECT "id", "bountyId", "approvalTaskId", "itemId", "status", "createdAt"
      FROM "BountyPublishingTask"
      ORDER BY "createdAt" DESC
    `;

    // Enrich with bounty and item data
    const enrichedTasks = await Promise.all(
      publishingTasks.map(async (task) => {
        const bountyRows = await prisma.$queryRaw<
          Array<{ title: string }>
        >`
          SELECT "title"
          FROM "BountyRequest"
          WHERE "id" = ${task.bountyId}
          LIMIT 1
        `;

        const itemRows = await prisma.$queryRaw<
          Array<{ name: string }>
        >`
          SELECT "name"
          FROM "ShopItem"
          WHERE "id" = ${task.itemId}
          LIMIT 1
        `;

        return {
          id: task.id,
          bountyId: task.bountyId,
          approvalTaskId: task.approvalTaskId,
          itemId: task.itemId,
          status: task.status,
          createdAt: task.createdAt.toISOString(),
          bountyTitle: bountyRows[0]?.title || "Unknown",
          itemName: itemRows[0]?.name || "Unknown",
        };
      })
    );

    return NextResponse.json(enrichedTasks);
  } catch (error) {
    console.error("Error fetching publishing tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
