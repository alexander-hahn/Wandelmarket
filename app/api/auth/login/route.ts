import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionForUser, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const ALLOWED_EMAIL_DOMAIN = "@wandelbots.com";

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof (body as { email?: unknown }).email === "string"
    ? (body as { email: string }).email.trim().toLowerCase()
    : "";
  const password = typeof (body as { password?: unknown }).password === "string"
    ? (body as { password: string }).password
    : "";

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  if (!isAllowedEmail(email)) {
    return NextResponse.json(
      { error: "Only @wandelbots.com email addresses are allowed." },
      { status: 400 }
    );
  }

  const appUser = (prisma as {
    appUser?: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        role: string;
        passwordHash: string | null;
      } | null>;
    };
  }).appUser;

  if (appUser) {
    const user = await appUser.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { passwordHash, ...safeUser } = user;
    const { token, expiresAt } = await createSessionForUser(user.id);

    const response = NextResponse.json(safeUser);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return response;
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      role: string;
      passwordHash: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT "id", "displayName", "firstName", "lastName", "email", "role", "passwordHash", "createdAt", "updatedAt"
    FROM "AppUser"
    WHERE "email" = ${email}
    LIMIT 1
  `;

  const user = rows[0] ?? null;
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { passwordHash, ...safeUser } = user;
  const { token, expiresAt } = await createSessionForUser(user.id);

  const response = NextResponse.json(safeUser);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
