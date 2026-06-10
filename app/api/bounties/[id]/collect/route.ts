import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const collectorId = auth.user.id;

  const bountyRequest = (prisma as {
    bountyRequest?: {
      findUnique: (args: unknown) => Promise<{ id: string; status: string } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  }).bountyRequest;

  if (bountyRequest) {
    const bounty = await bountyRequest.findUnique({ where: { id } });
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    if (bounty.status === "collected" || bounty.status === "converted") {
      return NextResponse.json(
        { error: "Closed bounties cannot be collected" },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      INSERT OR IGNORE INTO "BountyCollect" ("id", "bountyId", "collectorId", "createdAt")
      VALUES (lower(hex(randomblob(16))), ${id}, ${collectorId}, ${new Date()})
    `;

    if (bounty.status === "pending") return NextResponse.json(bounty);

    const updated = await bountyRequest.update({
      where: { id },
      data: { status: "pending" },
    });

    return NextResponse.json(updated);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "BountyRequest"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const bounty = rows[0] ?? null;
  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  if (bounty.status === "collected" || bounty.status === "converted") {
    return NextResponse.json(
      { error: "Closed bounties cannot be collected" },
      { status: 400 }
    );
  }

  await prisma.$executeRaw`
    INSERT OR IGNORE INTO "BountyCollect" ("id", "bountyId", "collectorId", "createdAt")
    VALUES (lower(hex(randomblob(16))), ${id}, ${collectorId}, ${new Date()})
  `;

  if (bounty.status === "pending") {
    const existingRows = await prisma.$queryRaw<
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
    >`SELECT * FROM "BountyRequest" WHERE "id" = ${id} LIMIT 1`;

    return NextResponse.json(existingRows[0] ?? null);
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET "status" = ${"pending"}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

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
  >`SELECT * FROM "BountyRequest" WHERE "id" = ${id} LIMIT 1`;

  return NextResponse.json(updatedRows[0] ?? null);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const collectorId = auth.user.id;

  const bountyRequest = (prisma as {
    bountyRequest?: {
      findUnique: (args: unknown) => Promise<{ id: string; status: string } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  }).bountyRequest;

  if (bountyRequest) {
    const bounty = await bountyRequest.findUnique({ where: { id } });
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    if (bounty.status === "collected" || bounty.status === "converted") {
      return NextResponse.json(
        { error: "Closed bounties cannot be reopened" },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      DELETE FROM "BountyCollect"
      WHERE "bountyId" = ${id} AND "collectorId" = ${collectorId}
    `;

    const collectorCounts = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT CAST(COUNT(*) AS INT) as "count"
      FROM "BountyCollect"
      WHERE "bountyId" = ${id}
    `;
    const remainingCollectors = collectorCounts[0]?.count ?? 0;

    if (bounty.status === "open" || remainingCollectors > 0) {
      return NextResponse.json(bounty);
    }

    const updated = await bountyRequest.update({ where: { id }, data: { status: "open" } });
    return NextResponse.json(updated);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "BountyRequest"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const bounty = rows[0] ?? null;
  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  if (bounty.status === "collected" || bounty.status === "converted") {
    return NextResponse.json(
      { error: "Closed bounties cannot be reopened" },
      { status: 400 }
    );
  }

  await prisma.$executeRaw`
    DELETE FROM "BountyCollect"
    WHERE "bountyId" = ${id} AND "collectorId" = ${collectorId}
  `;

  const collectorCounts = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT CAST(COUNT(*) AS INT) as "count"
    FROM "BountyCollect"
    WHERE "bountyId" = ${id}
  `;
  const remainingCollectors = collectorCounts[0]?.count ?? 0;

  if (bounty.status === "open" || remainingCollectors > 0) {
    const existingRows = await prisma.$queryRaw<
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
    >`SELECT * FROM "BountyRequest" WHERE "id" = ${id} LIMIT 1`;

    return NextResponse.json(existingRows[0] ?? null);
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET "status" = ${"open"}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

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
  >`SELECT * FROM "BountyRequest" WHERE "id" = ${id} LIMIT 1`;

  return NextResponse.json(updatedRows[0] ?? null);
}