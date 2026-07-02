import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserByToken } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  // Get the session token from cookies
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getSessionUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's display name for matching
  const userDisplayName = user.displayName?.trim() || user.id;

  // Fetch published items created by the current user
  const items = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      author: string;
      version: string | null;
      downloadUrl: string | null;
      repoUrl: string | null;
      websiteUrl: string | null;
      thumbnailUrl: string | null;
      thumbnailOverride: string | null;
      tags: string;
      source: string;
      providerKey: string | null;
      stars: number;
      installInstructions: string | null;
      visibility: string;
      createdAt: Date;
      updatedAt: Date;
      teamIds: string;
      teamNames: string;
    }>
  >`
    SELECT
      i.*,
      COALESCE((
        SELECT json_group_array(it."teamId")
        FROM "ShopItemTeam" it
        INNER JOIN "Team" t ON t."id" = it."teamId"
        WHERE it."itemId" = i."id" AND t."status" = ${"approved"}
      ), '[]') as "teamIds",
      COALESCE((
        SELECT json_group_array(t."name")
        FROM "ShopItemTeam" it
        INNER JOIN "Team" t ON t."id" = it."teamId"
        WHERE it."itemId" = i."id" AND t."status" = ${"approved"}
      ), '[]') as "teamNames"
    FROM "ShopItem" i
    WHERE i."author" = ${userDisplayName} AND i."visibility" IN (${"members"}, ${"teams"})
    ORDER BY i."createdAt" DESC
  `;

  return NextResponse.json(
    items.map((item) => ({
      ...item,
      teamIds: JSON.parse(item.teamIds || "[]"),
      teamNames: JSON.parse(item.teamNames || "[]"),
    }))
  );
}
