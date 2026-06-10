-- CreateTable
CREATE TABLE "ListingComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ListingComment_itemId_idx" ON "ListingComment"("itemId");

-- CreateIndex
CREATE INDEX "ListingComment_createdAt_idx" ON "ListingComment"("createdAt");
