-- CreateTable
CREATE TABLE "BountyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "requestedCategory" TEXT NOT NULL DEFAULT 'project',
    "reward" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "convertedItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BountyRequest_status_idx" ON "BountyRequest"("status");

-- CreateIndex
CREATE INDEX "BountyRequest_createdAt_idx" ON "BountyRequest"("createdAt");
