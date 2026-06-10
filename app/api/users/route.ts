import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response) return auth.response;

  const users = await prisma.$queryRaw<
    Array<{
      id: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      role: string;
      roleAssignmentRequired: boolean;
      createdAt: Date;
      updatedAt: Date;
      teamIds: string;
      teamNames: string;
    }>
  >`
    SELECT
      u."id",
      u."displayName",
      u."firstName",
      u."lastName",
      u."email",
      u."role",
      u."roleAssignmentRequired",
      u."createdAt",
      u."updatedAt",
      COALESCE((
        SELECT json_group_array(ut."teamId")
        FROM "AppUserTeam" ut
        WHERE ut."userId" = u."id"
      ), '[]') as "teamIds",
      COALESCE((
        SELECT json_group_array(t."name")
        FROM "AppUserTeam" ut
        INNER JOIN "Team" t ON t."id" = ut."teamId"
        WHERE ut."userId" = u."id" AND t."status" = ${"approved"}
      ), '[]') as "teamNames"
    FROM "AppUser" u
    ORDER BY u."roleAssignmentRequired" DESC, u."role" ASC, u."createdAt" ASC
  `;

  return NextResponse.json(
    users.map((user) => ({
      ...user,
      teamIds: JSON.parse(user.teamIds || "[]"),
      teamNames: JSON.parse(user.teamNames || "[]"),
    }))
  );
}
