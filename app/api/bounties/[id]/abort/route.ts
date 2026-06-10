import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const { id } = await params;

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

    if (bounty.status !== "pending") {
      return NextResponse.json({ error: "Only pending bounties can be aborted" }, { status: 400 });
    }

    const updated = await bountyRequest.update({
      where: { id },
      data: {
        status: "open",
        convertedItemId: null,
      },
    });

    await prisma.$executeRaw`DELETE FROM "BountyCollect" WHERE "bountyId" = ${id}`;
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

  if (bounty.status !== "pending") {
    return NextResponse.json({ error: "Only pending bounties can be aborted" }, { status: 400 });
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET "status" = ${"open"}, "convertedItemId" = ${null}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

  await prisma.$executeRaw`DELETE FROM "BountyCollect" WHERE "bountyId" = ${id}`;

  const updatedRows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "BountyRequest"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return NextResponse.json(updatedRows[0] ?? null);
}