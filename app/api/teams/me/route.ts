import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
      status: string;
    }>
  >`
    SELECT t."id", t."name", t."slug", ut."role", t."status"
    FROM "AppUserTeam" ut
    INNER JOIN "Team" t ON t."id" = ut."teamId"
    WHERE ut."userId" = ${auth.user.id}
    ORDER BY t."name" ASC
  `;

  return NextResponse.json(rows);
}
