import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: itemId } = await params;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      authorName: string;
      message: string;
      createdAt: Date;
    }>
  >`
    SELECT "id", "userId", "authorName", "message", "createdAt"
    FROM "ListingComment"
    WHERE "itemId" = ${itemId}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id: itemId } = await params;
  const body = await req.json().catch(() => ({}));

  const message =
    typeof (body as { message?: unknown }).message === "string"
      ? (body as { message: string }).message.trim()
      : "";

  if (!message) {
    return NextResponse.json({ error: "Comment message is required" }, { status: 400 });
  }

  const itemRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ShopItem"
    WHERE "id" = ${itemId}
    LIMIT 1
  `;

  if (!itemRows[0]) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const now = new Date();
  const authorName = auth.user.displayName?.trim() || auth.user.id;

  await prisma.$executeRaw`
    INSERT INTO "ListingComment" ("id", "itemId", "userId", "authorName", "message", "createdAt", "updatedAt")
    VALUES (lower(hex(randomblob(16))), ${itemId}, ${auth.user.id}, ${authorName}, ${message}, ${now}, ${now})
  `;

  const createdRows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      authorName: string;
      message: string;
      createdAt: Date;
    }>
  >`
    SELECT "id", "userId", "authorName", "message", "createdAt"
    FROM "ListingComment"
    WHERE "itemId" = ${itemId}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const created = createdRows[0];
  return NextResponse.json(
    {
      id: created.id,
      userId: created.userId,
      authorName: created.authorName,
      message: created.message,
      createdAt: new Date(created.createdAt).toISOString(),
    },
    { status: 201 }
  );
}
