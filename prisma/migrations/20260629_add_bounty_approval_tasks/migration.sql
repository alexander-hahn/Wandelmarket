-- CreateTable BountyApprovalTask
CREATE TABLE "BountyApprovalTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bountyId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "approvedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "BountyApprovalTask_bountyId_idx" ON "BountyApprovalTask"("bountyId");

-- CreateIndex
CREATE INDEX "BountyApprovalTask_approverUserId_idx" ON "BountyApprovalTask"("approverUserId");

-- CreateIndex
CREATE INDEX "BountyApprovalTask_status_idx" ON "BountyApprovalTask"("status");

-- CreateTable BountyPublishingTask
CREATE TABLE "BountyPublishingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bountyId" TEXT NOT NULL,
    "approvalTaskId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "BountyPublishingTask_bountyId_idx" ON "BountyPublishingTask"("bountyId");

-- CreateIndex
CREATE INDEX "BountyPublishingTask_status_idx" ON "BountyPublishingTask"("status");
