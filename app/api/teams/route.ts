import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { generateUniqueTeamSlug } from "@/lib/teams";

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  if (auth.user.role === "admin") {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        status: string;
        createdByUserId: string;
        leaderUserId: string;
        approvedByUserId: string | null;
        approvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT "id", "name", "slug", "status", "createdByUserId", "leaderUserId", "approvedByUserId", "approvedAt", "createdAt", "updatedAt"
      FROM "Team"
      ORDER BY CASE WHEN "status" = ${"pending"} THEN 0 ELSE 1 END, "name" ASC
    `;

    return NextResponse.json(rows);
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT "id", "name", "slug", "status", "createdAt", "updatedAt"
    FROM "Team"
    WHERE "status" = ${"approved"}
    ORDER BY "name" ASC
  `;

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const body = await req.json().catch(() => ({}));
  const name = typeof (body as { name?: unknown }).name === "string" ? (body as { name: string }).name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  const slug = await generateUniqueTeamSlug(name);
  if (!slug) {
    return NextResponse.json({ error: "Could not derive a valid team slug" }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "Team" (
      "id", "name", "slug", "status", "createdByUserId", "leaderUserId", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${name}, ${slug}, ${"pending"}, ${auth.user.id}, ${auth.user.id}, ${now}, ${now}
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO "AppUserTeam" ("userId", "teamId", "role", "createdAt")
    VALUES (${auth.user.id}, ${id}, ${"leader"}, ${now})
  `;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      createdByUserId: string;
      leaderUserId: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT "id", "name", "slug", "status", "createdByUserId", "leaderUserId", "createdAt", "updatedAt"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return NextResponse.json(rows[0] ?? null, { status: 201 });
}
