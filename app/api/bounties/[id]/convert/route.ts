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
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const collectorId = auth.user?.id || "";
  let itemIdFromBody: string | undefined;

  try {
    const body = await req.json();
    if (body && typeof body === "object" && "itemId" in body) {
      const value = (body as { itemId?: unknown }).itemId;
      if (typeof value === "string" && value.trim()) {
        itemIdFromBody = value.trim();
      }
    }
  } catch {
    // Accept empty body for backwards compatibility.
  }

  const bountyRequest = (prisma as {
    bountyRequest?: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        title: string;
        description: string;
        requester: string;
        requestedCategory: string;
        bountyStars: number;
        status: string;
      } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  }).bountyRequest;

  if (bountyRequest) {
    const bounty = await bountyRequest.findUnique({ where: { id } });
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    if (bounty.status !== "open" && bounty.status !== "pending") {
      return NextResponse.json(
        { error: "Only open or pending bounties can be converted" },
        { status: 400 }
      );
    }

    let item;
    if (itemIdFromBody) {
      item = await prisma.shopItem.findUnique({ where: { id: itemIdFromBody } });
      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
    } else {
      item = await prisma.shopItem.create({
        data: {
          name: bounty.title,
          description: bounty.description,
          category: bounty.requestedCategory || "project",
          author: bounty.requester,
          source: "manual",
          tags: JSON.stringify(["bounty", "request"]),
        },
      });
    }

    // Create approval task for the bounty requester to review
    const approvalTaskId = generateId();
    const now = new Date();
    
    try {
      await prisma.$executeRaw`
        INSERT INTO "BountyApprovalTask" ("id", "bountyId", "collectorId", "itemId", "approverUserId", "status", "createdAt", "updatedAt")
        VALUES (${approvalTaskId}, ${id}, ${collectorId}, ${item.id}, ${bounty.requester}, ${"pending"}, ${now}, ${now})
      `;
    } catch {
      // Ignore if table doesn't exist yet
    }

    // Update bounty status to "collected" (pending approval)
    const updatedBounty = itemIdFromBody
      ? await bountyRequest.update({
          where: { id: bounty.id },
          data: {
            status: "pending",
            convertedItemId: itemIdFromBody,
          },
        })
      : await bountyRequest.update({
          where: { id: bounty.id },
          data: {
            status: "pending",
            convertedItemId: item.id,
          },
        });

    try {
      await prisma.$executeRaw`DELETE FROM "BountyCollect" WHERE "bountyId" = ${bounty.id}`;
    } catch {
      // Ignore when running against databases without the collect table yet.
    }

    return NextResponse.json({ bounty: updatedBounty, item, approvalTaskId });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string;
      requester: string;
      requestedCategory: string;
      bountyStars: number;
      status: string;
    }>
  >`SELECT "id", "title", "description", "requester", "requestedCategory", "bountyStars", "status" FROM "BountyRequest" WHERE "id" = ${id} LIMIT 1`;

  const bounty = rows[0] ?? null;
  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  if (bounty.status !== "open" && bounty.status !== "pending") {
    return NextResponse.json(
      { error: "Only open or pending bounties can be converted" },
      { status: 400 }
    );
  }

  if (itemIdFromBody) {
    const now = new Date();
    await prisma.$executeRaw`
      UPDATE "BountyRequest"
      SET "status" = ${"collected"}, "convertedItemId" = ${itemIdFromBody}, "updatedAt" = ${now}
      WHERE "id" = ${bounty.id}
    `;

    try {
      await prisma.$executeRaw`DELETE FROM "BountyCollect" WHERE "bountyId" = ${bounty.id}`;
    } catch {
      // Ignore when running against databases without the collect table yet.
    }

    const updatedRows = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        description: string;
        requester: string;
        requestedCategory: string;
        bountyStars: number;
        reward: string | null;
        status: string;
        convertedItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`SELECT * FROM "BountyRequest" WHERE "id" = ${bounty.id} LIMIT 1`;

    const item = await prisma.shopItem.findUnique({ where: { id: itemIdFromBody } });
    return NextResponse.json({ bounty: updatedRows[0] ?? null, item });
  }

  const item = await prisma.shopItem.create({
    data: {
      name: bounty.title,
      description: bounty.description,
      category: bounty.requestedCategory || "project",
      author: bounty.requester,
      source: "manual",
      tags: JSON.stringify(["bounty", "request"]),
    },
  });

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET "status" = ${"collected"}, "convertedItemId" = ${item.id}, "updatedAt" = ${now}
    WHERE "id" = ${bounty.id}
  `;

  try {
    await prisma.$executeRaw`DELETE FROM "BountyCollect" WHERE "bountyId" = ${bounty.id}`;
  } catch {
    // Ignore when running against databases without the collect table yet.
  }

  const updatedRows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string;
      requester: string;
      requestedCategory: string;
      bountyStars: number;
      reward: string | null;
      status: string;
      convertedItemId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`SELECT * FROM "BountyRequest" WHERE "id" = ${bounty.id} LIMIT 1`;

  const updatedBounty = updatedRows[0] ?? null;

  return NextResponse.json({ bounty: updatedBounty, item });
}
