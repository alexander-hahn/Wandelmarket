import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { generateUniqueTeamSlug } from "@/lib/teams";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const name = typeof (body as { name?: unknown }).name === "string"
    ? (body as { name: string }).name.trim()
    : "";

  if (!name) {
    return NextResponse.json({ error: "Provide team name" }, { status: 400 });
  }

  const currentRows = await prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
    SELECT "id", "name", "slug"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const current = currentRows[0] ?? null;
  if (!current) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const finalName = name;
  const finalSlug = await generateUniqueTeamSlug(finalName, id);

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "Team"
    SET "name" = ${finalName}, "slug" = ${finalSlug}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

  const updatedRows = await prisma.$queryRaw<
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

  return NextResponse.json(updatedRows[0] ?? null);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Team"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  if (!rows[0]) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await prisma.$executeRaw`
    DELETE FROM "Team"
    WHERE "id" = ${id}
  `;

  return new NextResponse(null, { status: 204 });
}
