CREATE TABLE "BountyCollect" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bountyId" TEXT NOT NULL,
  "collectorId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "BountyCollect_bountyId_collectorId_key" ON "BountyCollect"("bountyId", "collectorId");
CREATE INDEX "BountyCollect_bountyId_idx" ON "BountyCollect"("bountyId");
