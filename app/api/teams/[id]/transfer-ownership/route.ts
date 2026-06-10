import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id: teamId } = await params;
  const body = await req.json().catch(() => ({}));

  const targetUserId =
    typeof (body as { targetUserId?: unknown }).targetUserId === "string"
      ? (body as { targetUserId: string }).targetUserId.trim()
      : "";

  const holdConfirmed = (body as { holdConfirmed?: unknown }).holdConfirmed === true;

  const reason =
    typeof (body as { reason?: unknown }).reason === "string"
      ? (body as { reason: string }).reason.trim()
      : null;

  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
  }

  if (!holdConfirmed) {
    return NextResponse.json({ error: "Hold-to-confirm is required" }, { status: 400 });
  }

  const teamRows = await prisma.$queryRaw<Array<{ id: string; leaderUserId: string }>>`
    SELECT "id", "leaderUserId"
    FROM "Team"
    WHERE "id" = ${teamId}
    LIMIT 1
  `;

  const team = teamRows[0] ?? null;
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const canTransfer = auth.user.role === "admin" || auth.user.id === team.leaderUserId;
  if (!canTransfer) {
    return NextResponse.json(
      { error: "Only admins or the current team owner can transfer ownership" },
      { status: 403 }
    );
  }

  if (team.leaderUserId === targetUserId) {
    return NextResponse.json({ error: "Selected user is already the team owner" }, { status: 400 });
  }

  const memberRows = await prisma.$queryRaw<Array<{ userId: string; role: string }>>`
    SELECT "userId", "role"
    FROM "AppUserTeam"
    WHERE "teamId" = ${teamId}
  `;

  const targetMembership = memberRows.find((row) => row.userId === targetUserId) ?? null;
  if (!targetMembership) {
    return NextResponse.json({ error: "Target user must already be a member of the team" }, { status: 400 });
  }

  const previousLeaderId = team.leaderUserId;

  const previousLeaderMembership = memberRows.find((row) => row.userId === previousLeaderId) ?? null;
  if (!previousLeaderMembership) {
    return NextResponse.json(
      { error: "Current owner must be a member of the team before ownership can be transferred" },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const updateTeamCount = await tx.$executeRaw`
      UPDATE "Team"
      SET "leaderUserId" = ${targetUserId}, "updatedAt" = ${new Date()}
      WHERE "id" = ${teamId} AND "leaderUserId" = ${previousLeaderId}
    `;

    if (Number(updateTeamCount) !== 1) {
      throw new Error("Team ownership changed concurrently. Please retry.");
    }

    const demotePreviousLeaderCount = await tx.$executeRaw`
      UPDATE "AppUserTeam"
      SET "role" = ${"member"}
      WHERE "teamId" = ${teamId} AND "userId" = ${previousLeaderId}
    `;

    if (Number(demotePreviousLeaderCount) !== 1) {
      throw new Error("Could not demote current owner. Please verify team membership.");
    }

    const promoteNewLeaderCount = await tx.$executeRaw`
      UPDATE "AppUserTeam"
      SET "role" = ${"leader"}
      WHERE "teamId" = ${teamId} AND "userId" = ${targetUserId}
    `;

    if (Number(promoteNewLeaderCount) !== 1) {
      throw new Error("Could not promote new owner. Please verify target membership.");
    }

    await tx.$executeRaw`
      INSERT INTO "TeamOwnershipAudit"
        ("id", "teamId", "fromLeaderUserId", "toLeaderUserId", "transferredByUserId", "reason", "createdAt")
      VALUES
        (lower(hex(randomblob(16))), ${teamId}, ${previousLeaderId}, ${targetUserId}, ${auth.user.id}, ${reason}, ${new Date()})
    `;
  });

  return NextResponse.json({ ok: true });
}
