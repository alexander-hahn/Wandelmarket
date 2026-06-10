import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function resolveRequesterIdentities(userId: string, displayName?: string | null): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<
    Array<{
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>
  >`
    SELECT "displayName", "firstName", "lastName", "email"
    FROM "AppUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  const profile = rows[0] ?? null;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();

  return new Set(
    [userId, displayName ?? "", profile?.displayName ?? "", profile?.email ?? "", fullName]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function findOwnedBountyOr403(
  bountyId: string,
  userId: string,
  displayName?: string | null
): Promise<
  | {
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
    }
  | null
> {
  const rows = await prisma.$queryRaw<
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
    }>
  >`
    SELECT "id", "title", "description", "requester", "requestedCategory", "bountyStars", "reward", "status", "convertedItemId", "createdAt"
    FROM "BountyRequest"
    WHERE "id" = ${bountyId}
    LIMIT 1
  `;

  const bounty = rows[0] ?? null;
  if (!bounty) return null;

  const identitySet = await resolveRequesterIdentities(userId, displayName);
  if (!identitySet.has(bounty.requester.trim().toLowerCase())) return null;

  return bounty;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const bounty = await findOwnedBountyOr403(id, auth.user.id, auth.user.displayName);

  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found or not allowed" }, { status: 404 });
  }

  return NextResponse.json(bounty);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const existing = await findOwnedBountyOr403(id, auth.user.id, auth.user.displayName);

  if (!existing) {
    return NextResponse.json({ error: "Bounty not found or not allowed" }, { status: 404 });
  }

  if (existing.status === "deleted") {
    return NextResponse.json({ error: "Deleted bounties cannot be edited" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    title,
    description,
    requestedCategory,
    reward,
  } = body as {
    title?: string;
    description?: string;
    requestedCategory?: string;
    reward?: unknown;
  };

  if (!title || !description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  const derivedRequester = auth.user.displayName?.trim() || auth.user.id;

  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET
      "title" = ${title},
      "description" = ${description},
      "requester" = ${derivedRequester},
      "requestedCategory" = ${requestedCategory || "project"},
      "reward" = ${normalizeOptionalString(reward)},
      "updatedAt" = ${new Date()}
    WHERE "id" = ${id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const existing = await findOwnedBountyOr403(id, auth.user.id, auth.user.displayName);

  if (!existing) {
    return NextResponse.json({ error: "Bounty not found or not allowed" }, { status: 404 });
  }

  await prisma.$executeRaw`
    UPDATE "BountyRequest"
    SET
      "status" = ${"deleted"},
      "convertedItemId" = ${null},
      "updatedAt" = ${new Date()}
    WHERE "id" = ${id}
  `;

  return new NextResponse(null, { status: 204 });
}
