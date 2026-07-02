import { prisma } from "@/lib/db";

export async function ensureCollectedBountiesColumn(): Promise<void> {
  const columns = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT "name"
    FROM pragma_table_info('AppUser')
  `;

  const hasColumn = columns.some((column) => column.name === "collectedBounties");
  if (!hasColumn) {
    await prisma.$executeRaw`
      ALTER TABLE "AppUser"
      ADD COLUMN "collectedBounties" INTEGER NOT NULL DEFAULT 0
    `;
  }
}

export async function getCollectedBountiesForUser(userId: string): Promise<number> {
  await syncCollectedBountiesFromHistory(userId);
  await ensureCollectedBountiesColumn();

  const rows = await prisma.$queryRaw<Array<{ collectedBounties: number | bigint }>>`
    SELECT COALESCE("collectedBounties", 0) as "collectedBounties"
    FROM "AppUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  const bounties = rows[0]?.collectedBounties ?? 0;
  return Number(bounties);
}

export async function syncCollectedBountiesFromHistory(userId: string): Promise<number> {
  await ensureCollectedBountiesColumn();

  const userRows = await prisma.$queryRaw<
    Array<{
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>
  >`
    SELECT "displayName", "firstName", "lastName", "email"
    FROM "AppUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  const profile = userRows[0] ?? null;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();

  const identitySet = new Set(
    [userId, profile?.displayName ?? "", profile?.email ?? "", fullName]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

  const historyRows = await prisma.$queryRaw<Array<{ requester: string; bountyStars: number | bigint }>>`
    SELECT "requester", "bountyStars"
    FROM "BountyRequest"
    WHERE "status" = ${"collected"} OR "status" = ${"deleted"}
  `;

  const total = historyRows.reduce((sum, row) => {
    const requester = row.requester?.trim().toLowerCase();
    if (!requester || !identitySet.has(requester)) return sum;

    const stars = Number.isFinite(Number(row.bountyStars)) ? Math.max(0, Math.floor(Number(row.bountyStars))) : 0;
    return sum + stars;
  }, 0);

  await prisma.$executeRaw`
    UPDATE "AppUser"
    SET "collectedBounties" = ${total}
    WHERE "id" = ${userId}
  `;

  return total;
}

export async function applyCollectedBountyRewards(bountyId: string, stars: number): Promise<void> {
  await ensureCollectedBountiesColumn();

  const starsValue = Math.max(0, Math.floor(Number(stars)));

  await prisma.$executeRaw`
    UPDATE "AppUser"
    SET "collectedBounties" = COALESCE("collectedBounties", 0) + ${starsValue}
    WHERE "id" IN (
      SELECT DISTINCT bc."collectorId"
      FROM "BountyCollect" bc
      WHERE bc."bountyId" = ${bountyId}
    )
  `;
}
