import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;

  const appUser = (prisma as {
    appUser?: {
      findUnique: (args: unknown) => Promise<{ id: string } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  }).appUser;

  if (appUser) {
    const existing = await appUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await appUser.update({
      where: { id },
      data: { roleAssignmentRequired: false },
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        roleAssignmentRequired: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
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
  await prisma.$executeRaw`
    UPDATE "AppUser"
    SET "roleAssignmentRequired" = ${false}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

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