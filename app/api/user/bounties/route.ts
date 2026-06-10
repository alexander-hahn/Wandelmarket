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

  const requesterSet = new Set<string>([
    auth.user.id,
    auth.user.displayName ?? "",
    profile?.displayName ?? "",
    profile?.email ?? "",
    fullName,
  ]);

  const normalizedRequesters = Array.from(requesterSet)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

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
    ORDER BY "createdAt" DESC
  `;

  const myRows = rows.filter((row) => normalizedRequesters.includes(row.requester.trim().toLowerCase()));
  return NextResponse.json(myRows);
}
