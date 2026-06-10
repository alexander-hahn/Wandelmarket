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

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  await ensureDeletionRequestTable();

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      itemId: string;
      itemName: string;
      itemCategory: string;
      itemAuthor: string;
      requestedByUserId: string;
      requestedByDisplayName: string | null;
      status: string;
      createdAt: Date;
    }>
  >`
    SELECT
      dr."id",
      dr."itemId",
      COALESCE(i."name", ${"(deleted listing)"}) as "itemName",
      COALESCE(i."category", ${"project"}) as "itemCategory",
      COALESCE(i."author", ${"unknown"}) as "itemAuthor",
      dr."requestedByUserId",
      u."displayName" as "requestedByDisplayName",
      dr."status",
      dr."createdAt"
    FROM "ListingDeletionRequest" dr
    LEFT JOIN "ShopItem" i ON i."id" = dr."itemId"
    LEFT JOIN "AppUser" u ON u."id" = dr."requestedByUserId"
    WHERE dr."status" = ${"pending"}
    ORDER BY dr."createdAt" ASC
  `;

  return NextResponse.json(rows);
}
