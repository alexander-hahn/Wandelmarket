import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response || !auth.user) return auth.response;

  const { id: itemId, commentId } = await params;

  const commentRows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
    SELECT "id", "userId"
    FROM "ListingComment"
    WHERE "id" = ${commentId} AND "itemId" = ${itemId}
    LIMIT 1
  `;

  const comment = commentRows[0];
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.userId !== auth.user.id) {
    return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
  }

  await prisma.$executeRaw`
    DELETE FROM "ListingComment"
    WHERE "id" = ${commentId}
  `;

  return new NextResponse(null, { status: 204 });
}
