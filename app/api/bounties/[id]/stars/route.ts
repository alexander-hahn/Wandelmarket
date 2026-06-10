import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const deltaRaw = Number(body?.delta);
  const delta = deltaRaw >= 0 ? 1 : -1;

  const bountyRequest = (prisma as {
    bountyRequest?: {
      findUnique: (args: unknown) => Promise<{ id: string; bountyStars: number } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  }).bountyRequest;

  if (bountyRequest) {
    const existing = await bountyRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    const nextStars = Math.max(1, (existing.bountyStars ?? 1) + delta);

    const updated = await bountyRequest.update({
      where: { id },
      data: { bountyStars: nextStars },
    });

    return NextResponse.json(updated);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; bountyStars: number }>>`
    SELECT "id", "bountyStars" FROM "BountyRequest" WHERE "id" = ${id} LIMIT 1
  `;

  const existing = rows[0] ?? null;
  if (!existing) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  const nextStars = Math.max(1, (existing.bountyStars ?? 1) + delta);
  const now = new Date();

  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET "bountyStars" = ${nextStars}, "updatedAt" = ${now}
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
