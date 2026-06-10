import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { requireRoles } from "@/lib/auth";

export async function GET() {
  const bountyRequest = (prisma as {
    bountyRequest?: { findMany: (args: unknown) => Promise<unknown> };
  }).bountyRequest;

  if (bountyRequest) {
    const bounties = await bountyRequest.findMany({
      orderBy: [{ status: "asc" }, { bountyStars: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(bounties);
  }

  const bounties = await prisma.$queryRaw<
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
  >`SELECT * FROM "BountyRequest" ORDER BY "status" ASC, "bountyStars" DESC, "createdAt" DESC`;

  return NextResponse.json(bounties);
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const body = await req.json();

  const { title, description, requester, requestedCategory, reward, bountyStars } = body;

  if (requester !== undefined) {
    return NextResponse.json(
      { error: "requester cannot be set directly; it is derived from the logged-in user" },
      { status: 400 }
    );
  }

  const resolvedRequester = auth.user.displayName?.trim() || auth.user.id;

  const parsedBountyStars = Number(bountyStars);
  const safeBountyStars = Number.isFinite(parsedBountyStars)
    ? Math.max(1, Math.min(100, Math.floor(parsedBountyStars)))
    : 1;

  if (!title || !description) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 }
    );
  }

  const bountyRequest = (prisma as {
    bountyRequest?: { create: (args: unknown) => Promise<unknown> };
  }).bountyRequest;

  if (bountyRequest) {
    const bounty = await bountyRequest.create({
      data: {
        title,
        description,
        requester: resolvedRequester,
        requestedCategory: requestedCategory || "project",
        bountyStars: safeBountyStars,
        reward: reward || undefined,
        status: "open",
      },
    });
    return NextResponse.json(bounty, { status: 201 });
  }

  const id = randomUUID();
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "BountyRequest"
      ("id", "title", "description", "requester", "requestedCategory", "bountyStars", "reward", "status", "createdAt", "updatedAt")
    VALUES
      (${id}, ${title}, ${description}, ${resolvedRequester}, ${requestedCategory || "project"}, ${safeBountyStars}, ${reward || null}, ${"open"}, ${now}, ${now})
  `;

  const created = await prisma.$queryRaw<
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

  return NextResponse.json(created[0], { status: 201 });
}
