import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { APP_ROLES, requireRoles } from "@/lib/auth";

function parseRole(value: unknown) {
  if (typeof value !== "string") return null;
  return APP_ROLES.includes(value as (typeof APP_ROLES)[number])
    ? (value as (typeof APP_ROLES)[number])
    : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const role = parseRole((body as { role?: unknown }).role);
  const teamIds = Array.isArray((body as { teamIds?: unknown }).teamIds)
    ? (body as { teamIds: unknown[] }).teamIds.filter((entry): entry is string => typeof entry === "string")
    : null;

  if (!role && teamIds === null) {
    return NextResponse.json({ error: "Provide role and/or teamIds" }, { status: 400 });
  }

  if (role && auth.user && auth.user.id === id && role !== "admin") {
    return NextResponse.json(
      { error: "You cannot remove your own admin role." },
      { status: 400 }
    );
  }

  const existingRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "AppUser"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  if (!existingRows[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = new Date();
  if (role) {
    await prisma.$executeRaw`
      UPDATE "AppUser"
      SET "role" = ${role}, "roleAssignmentRequired" = ${false}, "updatedAt" = ${now}
      WHERE "id" = ${id}
    `;
  }

  if (teamIds !== null) {
    const safeTeamIds = teamIds.map((entry) => entry.trim()).filter(Boolean);

    const ownedTeamRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Team"
      WHERE "leaderUserId" = ${id}
    `;

    const ownedTeamIds = ownedTeamRows.map((row) => row.id);
    const finalTeamIds = Array.from(new Set([...safeTeamIds, ...ownedTeamIds]));

    const existingMembershipRows = await prisma.$queryRaw<Array<{ teamId: string; role: string }>>`
      SELECT "teamId", "role"
      FROM "AppUserTeam"
      WHERE "userId" = ${id}
    `;
    const roleByTeamId = new Map(existingMembershipRows.map((row) => [row.teamId, row.role]));

    await prisma.$executeRaw`DELETE FROM "AppUserTeam" WHERE "userId" = ${id}`;

    for (const teamId of finalTeamIds) {
      const preservedRole = roleByTeamId.get(teamId) ?? "member";
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO "AppUserTeam" ("userId", "teamId", "role", "createdAt")
        VALUES (${id}, ${teamId}, ${preservedRole}, ${new Date()})
      `;
    }
  }

  const updatedRows = await prisma.$queryRaw<
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
    }>
  >`
    SELECT "id", "displayName", "firstName", "lastName", "email", "role", "roleAssignmentRequired", "createdAt", "updatedAt"
    FROM "AppUser"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return NextResponse.json(updatedRows[0] ?? null);
}
