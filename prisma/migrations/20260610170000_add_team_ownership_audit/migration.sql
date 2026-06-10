-- CreateTable
CREATE TABLE "TeamOwnershipAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "fromLeaderUserId" TEXT NOT NULL,
    "toLeaderUserId" TEXT NOT NULL,
    "transferredByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TeamOwnershipAudit_teamId_idx" ON "TeamOwnershipAudit"("teamId");

-- CreateIndex
CREATE INDEX "TeamOwnershipAudit_createdAt_idx" ON "TeamOwnershipAudit"("createdAt");
