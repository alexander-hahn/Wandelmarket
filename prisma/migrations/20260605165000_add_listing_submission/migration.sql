CREATE TABLE "ListingSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "version" TEXT,
  "downloadUrl" TEXT,
  "repoUrl" TEXT,
  "websiteUrl" TEXT,
  "thumbnailUrl" TEXT,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "installInstructions" TEXT,
  "submittedByUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approvedByUserId" TEXT,
  "approvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ListingSubmission_status_idx" ON "ListingSubmission"("status");
CREATE INDEX "ListingSubmission_submittedByUserId_idx" ON "ListingSubmission"("submittedByUserId");
CREATE INDEX "ListingSubmission_createdAt_idx" ON "ListingSubmission"("createdAt");
