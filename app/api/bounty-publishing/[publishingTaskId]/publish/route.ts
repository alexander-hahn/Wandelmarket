import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publishingTaskId: string }> }
) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const { publishingTaskId } = await params;

  try {
    // Get the publishing task
    const publishingTaskRows = await prisma.$queryRaw<
      Array<{
        id: string;
        bountyId: string;
        approvalTaskId: string;
        itemId: string;
        status: string;
      }>
    >`
      SELECT "id", "bountyId", "approvalTaskId", "itemId", "status"
      FROM "BountyPublishingTask"
      WHERE "id" = ${publishingTaskId}
      LIMIT 1
    `;

    const publishingTask = publishingTaskRows[0];
    if (!publishingTask) {
      return NextResponse.json({ error: "Publishing task not found" }, { status: 404 });
    }

    if (publishingTask.status !== "pending") {
      return NextResponse.json(
        { error: `Task is already ${publishingTask.status}` },
        { status: 400 }
      );
    }

    const now = new Date();

    // Check if this is a bounty submission or just an item ID
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
        collectorId: string;
      }>
    >`
      SELECT * FROM "BountySubmission"
      WHERE "id" = ${publishingTask.itemId}
      LIMIT 1
    `;

    let createdItemId = publishingTask.itemId;

    if (submissionRows.length > 0) {
      const submission = submissionRows[0];

      // Create the actual ShopItem from the BountySubmission
      const item = await prisma.shopItem.create({
        data: {
          name: submission.name,
          description: submission.description,
          category: submission.category,
          author: submission.collectorId,
          version: submission.version,
          downloadUrl: submission.downloadUrl,
          repoUrl: submission.repoUrl,
          websiteUrl: submission.websiteUrl,
          thumbnailUrl: submission.thumbnailUrl,
          tags: submission.tags,
          installInstructions: submission.installInstructions,
          compatibilityOs: submission.compatibilityOs,
          compatibilityAppVersions: submission.compatibilityAppVersions,
          compatibilityToolchain: submission.compatibilityToolchain,
          source: "manual",
        },
      });

      createdItemId = item.id;

      // Update the submission to reference the created item
      await prisma.$executeRaw`
        UPDATE "BountySubmission"
        SET "status" = ${"approved"}, "updatedAt" = ${now}
        WHERE "id" = ${submission.id}
      `;
    }

    // Update publishing task to published
    await prisma.$executeRaw`
      UPDATE "BountyPublishingTask"
      SET "status" = ${"published"}, "publishedAt" = ${now}, "updatedAt" = ${now}, "itemId" = ${createdItemId}
      WHERE "id" = ${publishingTaskId}
    `;

    // Update bounty status to collected
    await prisma.$executeRaw`
      UPDATE "BountyRequest"
      SET "status" = ${"collected"}, "convertedItemId" = ${createdItemId}, "updatedAt" = ${now}
      WHERE "id" = ${publishingTask.bountyId}
    `;

    return NextResponse.json({
      message: "Item published. Bounty marked as collected.",
      itemId: createdItemId,
    });
  } catch (error) {
    console.error("Error publishing bounty item:", error);
    return NextResponse.json(
      { error: "Failed to publish bounty item" },
      { status: 500 }
    );
  }
}
