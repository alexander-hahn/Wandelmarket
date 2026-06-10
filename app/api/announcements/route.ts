import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

type AnnouncementTarget = "wandelmarket" | "bounties";

function normalizeTarget(value: unknown): AnnouncementTarget | null {
  return value === "wandelmarket" || value === "bounties" ? value : null;
}

export async function GET(req: Request) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      message: string;
      target: string;
      enabled: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT "id", "title", "message", "target", "enabled", "createdAt", "updatedAt"
    FROM "Announcement"
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      target: row.target === "bounties" ? "bounties" : "wandelmarket",
      enabled: Boolean(row.enabled),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));

  const title = typeof (body as { title?: unknown }).title === "string" ? (body as { title: string }).title.trim() : "";
  const message =
    typeof (body as { message?: unknown }).message === "string" ? (body as { message: string }).message.trim() : "";
  const target = normalizeTarget((body as { target?: unknown }).target);
  const enabled = (body as { enabled?: unknown }).enabled !== false;

  if (!title || !message || !target) {
    return NextResponse.json(
      { error: "title, message and valid target are required" },
      { status: 400 }
    );
  }

  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "Announcement" ("id", "title", "message", "target", "enabled", "createdAt", "updatedAt")
    VALUES (lower(hex(randomblob(16))), ${title}, ${message}, ${target}, ${enabled ? 1 : 0}, ${now}, ${now})
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
