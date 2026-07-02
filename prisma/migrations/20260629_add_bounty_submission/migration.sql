-- CreateTable BountySubmission
CREATE TABLE "BountySubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bountyId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT,
    "downloadUrl" TEXT,
    "repoUrl" TEXT,
    "websiteUrl" TEXT,
    "thumbnailUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "installInstructions" TEXT,
    "compatibilityOs" TEXT NOT NULL DEFAULT '[]',
    "compatibilityAppVersions" TEXT NOT NULL DEFAULT '[]',
    "compatibilityToolchain" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedByBountyRequester" BOOLEAN NOT NULL DEFAULT false,
    "approvalTaskId" TEXT,
    "publishingTaskId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BountySubmission_bountyId_idx" ON "BountySubmission"("bountyId");

-- CreateIndex
CREATE INDEX "BountySubmission_collectorId_idx" ON "BountySubmission"("collectorId");

-- CreateIndex
CREATE INDEX "BountySubmission_status_idx" ON "BountySubmission"("status");
