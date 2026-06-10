import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const ALLOWED_EMAIL_DOMAIN = "@wandelbots.com";

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function getDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

async function defaultRoleForNewUser(): Promise<"member" | "admin"> {
  const appUser = (prisma as {
    appUser?: { count: () => Promise<number> };
  }).appUser;

  if (appUser) {
    const count = await appUser.count();
    return count === 0 ? "admin" : "member";
  }

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT CAST(COUNT(*) AS INT) as "count"
    FROM "AppUser"
  `;

  return (rows[0]?.count ?? 0) === 0 ? "admin" : "member";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const firstName = typeof (body as { firstName?: unknown }).firstName === "string"
    ? (body as { firstName: string }).firstName.trim()
    : "";
  const lastName = typeof (body as { lastName?: unknown }).lastName === "string"
    ? (body as { lastName: string }).lastName.trim()
    : "";
  const email = typeof (body as { email?: unknown }).email === "string"
    ? (body as { email: string }).email.trim().toLowerCase()
    : "";
  const password = typeof (body as { password?: unknown }).password === "string"
    ? (body as { password: string }).password
    : "";

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "firstName, lastName, email and password are required" },
      { status: 400 }
    );
  }

  if (!isAllowedEmail(email)) {
    return NextResponse.json(
      { error: "Only @wandelbots.com email addresses are allowed." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const displayName = getDisplayName(firstName, lastName);
  const role = await defaultRoleForNewUser();
  const id = randomUUID();

  const appUser = (prisma as {
    appUser?: {
      create: (args: unknown) => Promise<unknown>;
    };
  }).appUser;

  try {
    if (appUser) {
      const user = await appUser.create({
        data: {
          id,
          firstName,
          lastName,
          email,
          passwordHash,
          displayName,
          role,
          roleAssignmentRequired: role !== "admin",
        },
      });
      const { passwordHash: _passwordHash, ...safeUser } = user as {
        passwordHash?: string | null;
      };
      return NextResponse.json(safeUser, { status: 201 });
    }

    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO "AppUser" (
        "id", "displayName", "firstName", "lastName", "email", "passwordHash", "role", "roleAssignmentRequired", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${displayName}, ${firstName}, ${lastName}, ${email}, ${passwordHash}, ${role}, ${role !== "admin"}, ${now}, ${now}
      )
    `;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        role: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT "id", "displayName", "firstName", "lastName", "email", "role", "createdAt", "updatedAt"
      FROM "AppUser"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    return NextResponse.json(rows[0] ?? null, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "User could not be created. Email might already exist." },
      { status: 409 }
    );
  }
}
