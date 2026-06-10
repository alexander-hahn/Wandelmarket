import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;

  const rows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const team = rows[0] ?? null;
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.status !== "pending") {
    return NextResponse.json({ error: "Team request already processed" }, { status: 400 });
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "Team"
    SET "status" = ${"rejected"}, "approvedByUserId" = ${auth.user.id}, "approvedAt" = ${now}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

  const updatedRows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return NextResponse.json(updatedRows[0] ?? null);
}
