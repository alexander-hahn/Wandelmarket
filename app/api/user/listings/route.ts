import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

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

  const submissionRows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      author: string;
      status: string;
      createdAt: Date;
      approvedAt: Date | null;
      source: "submission";
      deletionRequestStatus: null;
    }>
  >`
    SELECT "id", "name", "description", "category", "author", "status", "createdAt", "approvedAt", ${"submission"} as "source", ${null} as "deletionRequestStatus"
    FROM "ListingSubmission"
    WHERE "submittedByUserId" = ${auth.user.id}
    ORDER BY "createdAt" DESC
  `;

  let itemRows: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    author: string;
    createdAt: Date;
    deletionRequestStatus: string | null;
  }> = [];

  try {
    itemRows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        author: string;
        createdAt: Date;
        deletionRequestStatus: string | null;
      }>
    >`
      SELECT
        i."id",
        i."name",
        i."description",
        i."category",
        i."author",
        i."createdAt",
        (
          SELECT dr."status"
          FROM "ListingDeletionRequest" dr
          WHERE dr."itemId" = i."id"
          LIMIT 1
        ) as "deletionRequestStatus"
      FROM "ShopItem" i
      WHERE (
        SELECT dr2."status"
        FROM "ListingDeletionRequest" dr2
        WHERE dr2."itemId" = i."id"
        LIMIT 1
      ) IS NULL OR (
        SELECT dr3."status"
        FROM "ListingDeletionRequest" dr3
        WHERE dr3."itemId" = i."id"
        LIMIT 1
      ) <> ${"approved"}
      ORDER BY "createdAt" DESC
    `;
  } catch {
    const fallbackRows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        author: string;
        createdAt: Date;
      }>
    >`
      SELECT "id", "name", "description", "category", "author", "createdAt"
      FROM "ShopItem"
      ORDER BY "createdAt" DESC
    `;

    itemRows = fallbackRows.map((row) => ({ ...row, deletionRequestStatus: null }));
  }

  const authoredItems = itemRows
    .filter((row) => normalizedIdentities.includes(row.author.trim().toLowerCase()))
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      author: row.author,
      status: "approved",
      createdAt: row.createdAt,
      approvedAt: row.createdAt,
      source: "published" as const,
      deletionRequestStatus: row.deletionRequestStatus,
    }));

  const rows = [...submissionRows, ...authoredItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(rows);
}
