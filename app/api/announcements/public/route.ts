import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type AnnouncementTarget = "wandelmarket" | "bounties";

function normalizeTarget(value: string | null): AnnouncementTarget {
  return value === "bounties" ? "bounties" : "wandelmarket";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = normalizeTarget(url.searchParams.get("target"));

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      message: string;
      target: string;
      updatedAt: Date;
      createdAt: Date;
    }>
  >`
    SELECT "id", "title", "message", "target", "updatedAt", "createdAt"
    FROM "Announcement"
    WHERE "enabled" = ${1} AND "target" = ${target}
    ORDER BY "createdAt" DESC
  `;

  const payload =
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      target: row.target === "bounties" ? "bounties" : "wandelmarket",
      updatedAt: new Date(row.updatedAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
    }));

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
