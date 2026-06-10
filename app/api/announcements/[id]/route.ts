import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

type AnnouncementTarget = "wandelmarket" | "bounties";

function normalizeTarget(value: unknown): AnnouncementTarget | null {
  return value === "wandelmarket" || value === "bounties" ? value : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const title =
    typeof (body as { title?: unknown }).title === "string"
      ? (body as { title: string }).title.trim()
      : undefined;
  const message =
    typeof (body as { message?: unknown }).message === "string"
      ? (body as { message: string }).message.trim()
      : undefined;
  const maybeTarget = (body as { target?: unknown }).target;
  const target = maybeTarget === undefined ? undefined : normalizeTarget(maybeTarget);
  const enabled =
    typeof (body as { enabled?: unknown }).enabled === "boolean"
      ? (body as { enabled: boolean }).enabled
      : undefined;

  if (target === null) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) {
    if (!title) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    updates.push('"title" = ?');
    values.push(title);
  }

  if (message !== undefined) {
    if (!message) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    updates.push('"message" = ?');
    values.push(message);
  }

  if (target !== undefined) {
    updates.push('"target" = ?');
    values.push(target);
  }

  if (enabled !== undefined) {
    updates.push('"enabled" = ?');
    values.push(enabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  updates.push('"updatedAt" = ?');
  values.push(new Date());
  values.push(id);

  const updatedCount = await prisma.$executeRawUnsafe(
    `UPDATE "Announcement" SET ${updates.join(", ")} WHERE "id" = ?`,
    ...values
  );

  if (Number(updatedCount) === 0) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  const { id } = await params;

  const deletedCount = await prisma.$executeRaw`
    DELETE FROM "Announcement"
    WHERE "id" = ${id}
  `;

  if (Number(deletedCount) === 0) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
