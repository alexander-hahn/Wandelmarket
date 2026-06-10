import { NextResponse } from "next/server";
import { syncAllProviders } from "@/lib/providers/registry";
import { requireRoles } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = await requireRoles(req, ["admin", "moderator"]);
  if (auth.response) return auth.response;

  try {
    const results = await syncAllProviders();
    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    return NextResponse.json({ synced: totalSynced, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
