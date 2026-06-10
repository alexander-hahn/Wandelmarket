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
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response || !auth.user) return auth.response;

  await ensureDeletionRequestTable();

  const { id } = await params;

  const requestRows = await prisma.$queryRaw<
    Array<{ id: string; status: string }>
  >`
    SELECT "id", "status"
    FROM "ListingDeletionRequest"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const requestRow = requestRows[0] ?? null;
  if (!requestRow) {
    return NextResponse.json({ error: "Deletion request not found" }, { status: 404 });
  }

  if (requestRow.status !== "pending") {
    return NextResponse.json({ error: "Only pending deletion requests can be rejected" }, { status: 400 });
  }

  const now = new Date();

  await prisma.$executeRaw`
    UPDATE "ListingDeletionRequest"
    SET "status" = ${"rejected"}, "reviewedByUserId" = ${auth.user.id}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

  return NextResponse.json({ ok: true });
}
