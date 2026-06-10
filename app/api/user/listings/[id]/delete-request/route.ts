import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function ensureDeletionRequestTable() {
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "ListingDeletionRequest" ("id" TEXT PRIMARY KEY, "itemId" TEXT NOT NULL UNIQUE, "requestedByUserId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'pending\', "reviewedByUserId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)'
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "ListingDeletionRequest_status_idx" ON "ListingDeletionRequest"("status")'
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  await ensureDeletionRequestTable();

  const { id } = await params;

  const itemRows = await prisma.$queryRaw<Array<{ id: string; author: string }>>`
    SELECT "id", "author"
    FROM "ShopItem"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const item = itemRows[0] ?? null;
  if (!item) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const userRows = await prisma.$queryRaw<
    Array<{
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>
  >`
    SELECT "displayName", "firstName", "lastName", "email"
    FROM "AppUser"
    WHERE "id" = ${auth.user.id}
    LIMIT 1
  `;

  const profile = userRows[0] ?? null;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();

  const identitySet = new Set<string>([
    auth.user.id,
    auth.user.displayName ?? "",
    profile?.displayName ?? "",
    profile?.email ?? "",
    fullName,
  ]);

  const normalizedIdentities = Array.from(identitySet)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!normalizedIdentities.includes(item.author.trim().toLowerCase())) {
    return NextResponse.json({ error: "You can only request deletion for your own listings" }, { status: 403 });
  }

  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO "ListingDeletionRequest" ("id", "itemId", "requestedByUserId", "status", "createdAt", "updatedAt")
    VALUES (lower(hex(randomblob(16))), ${id}, ${auth.user.id}, ${"pending"}, ${now}, ${now})
    ON CONFLICT("itemId") DO UPDATE SET
      "requestedByUserId" = excluded."requestedByUserId",
      "status" = ${"pending"},
      "reviewedByUserId" = ${null},
      "updatedAt" = ${now}
  `;

  const requestRows = await prisma.$queryRaw<
    Array<{ id: string; itemId: string; requestedByUserId: string; status: string; createdAt: Date; updatedAt: Date }>
  >`
    SELECT "id", "itemId", "requestedByUserId", "status", "createdAt", "updatedAt"
    FROM "ListingDeletionRequest"
    WHERE "itemId" = ${id}
    LIMIT 1
  `;

  return NextResponse.json(requestRows[0] ?? null, { status: 201 });
}
