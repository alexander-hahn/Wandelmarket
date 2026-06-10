import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;

  const teamRows = await prisma.$queryRaw<Array<{ id: string; leaderUserId: string }>>`
    SELECT "id", "leaderUserId"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const team = teamRows[0] ?? null;
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const canReadMembers = auth.user.role === "admin" || auth.user.id === team.leaderUserId;
  if (!canReadMembers) {
    return NextResponse.json(
      { error: "Only admins or the team leader can view team members" },
      { status: 403 }
    );
  }

  const rows = await prisma.$queryRaw<
    Array<{
      userId: string;
      role: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>
  >`
    SELECT
      ut."userId",
      ut."role",
      u."displayName",
      u."firstName",
      u."lastName",
      u."email"
    FROM "AppUserTeam" ut
    INNER JOIN "AppUser" u ON u."id" = ut."userId"
    WHERE ut."teamId" = ${id}
    ORDER BY CASE WHEN ut."role" = ${"leader"} THEN 0 ELSE 1 END, u."email" ASC
  `;

  return NextResponse.json(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const userEmail = typeof (body as { userEmail?: unknown }).userEmail === "string"
    ? (body as { userEmail: string }).userEmail.trim().toLowerCase()
    : "";

  if (!userEmail) {
    return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
  }

  const teamRows = await prisma.$queryRaw<Array<{ id: string; status: string; leaderUserId: string }>>`
    SELECT "id", "status", "leaderUserId"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const team = teamRows[0] ?? null;
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.status !== "approved") {
    return NextResponse.json({ error: "Team must be approved before adding members" }, { status: 400 });
  }

  const isAllowed = auth.user.role === "admin" || team.leaderUserId === auth.user.id;
  if (!isAllowed) {
    return NextResponse.json({ error: "Only admins or the team leader can add members" }, { status: 403 });
  }

  const userRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "AppUser"
    WHERE lower(COALESCE("email", '')) = ${userEmail}
    LIMIT 1
  `;

  const targetUser = userRows[0] ?? null;
  if (!targetUser) {
    return NextResponse.json({ error: "User with this email was not found" }, { status: 404 });
  }

  const existingRows = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT "userId"
    FROM "AppUserTeam"
    WHERE "userId" = ${targetUser.id} AND "teamId" = ${id}
    LIMIT 1
  `;

  if (!existingRows[0]) {
    await prisma.$executeRaw`
      INSERT INTO "AppUserTeam" ("userId", "teamId", "role", "createdAt")
      VALUES (${targetUser.id}, ${id}, ${"member"}, ${new Date()})
    `;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const userId = typeof (body as { userId?: unknown }).userId === "string"
    ? (body as { userId: string }).userId.trim()
    : "";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const teamRows = await prisma.$queryRaw<Array<{ id: string; status: string; leaderUserId: string }>>`
    SELECT "id", "status", "leaderUserId"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const team = teamRows[0] ?? null;
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const isAllowed = auth.user.role === "admin" || team.leaderUserId === auth.user.id;
  if (!isAllowed) {
    return NextResponse.json({ error: "Only admins or the team leader can remove members" }, { status: 403 });
  }

  if (userId === team.leaderUserId) {
    return NextResponse.json({ error: "Cannot remove the current team leader." }, { status: 400 });
  }

  await prisma.$executeRaw`
    DELETE FROM "AppUserTeam"
    WHERE "teamId" = ${id} AND "userId" = ${userId}
  `;

  return NextResponse.json({ ok: true });
}
