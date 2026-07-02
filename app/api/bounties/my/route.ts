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

  // Fetch bounties created by the current user with status "open"
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
  >`
    SELECT * FROM "BountyRequest"
    WHERE "requester" = ${userDisplayName} AND "status" = ${"open"}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json(bounties);
}
