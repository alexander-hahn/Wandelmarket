import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(req, ["admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;

  const listingSubmission = (prisma as {
    listingSubmission?: {
      findUnique: (args: unknown) => Promise<{ id: string; status: string } | null>;
      update: (args: unknown) => Promise<unknown>;
    };
  }).listingSubmission;

  if (listingSubmission) {
    const submission = await listingSubmission.findUnique({ where: { id } });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (submission.status !== "pending") {
      return NextResponse.json({ error: "Submission already processed" }, { status: 400 });
    }

    const updated = await listingSubmission.update({
      where: { id },
      data: {
        status: "rejected",
        approvedByUserId: auth.user.id,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "ListingSubmission"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  const submission = rows[0] ?? null;
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.status !== "pending") {
    return NextResponse.json({ error: "Submission already processed" }, { status: 400 });
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "ListingSubmission"
    SET "status" = ${"rejected"}, "approvedByUserId" = ${auth.user.id}, "approvedAt" = ${now}, "updatedAt" = ${now}
    WHERE "id" = ${id}
  `;

  const updatedRows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "ListingSubmission"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return NextResponse.json(updatedRows[0] ?? null);
}