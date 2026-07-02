import { NextResponse } from "next/server";
import { getSessionUserByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const sessionPart = parts.find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = sessionPart ? decodeURIComponent(sessionPart.slice(`${SESSION_COOKIE_NAME}=`.length)) : "";

  if (!token) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const user = await getSessionUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Ensure all numeric fields are proper numbers (not BigInt)
  return NextResponse.json({
    ...user,
    collectedBounties: Number(user.collectedBounties),
  });
}
