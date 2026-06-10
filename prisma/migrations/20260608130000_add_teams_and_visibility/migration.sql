-- Add visibility fields
ALTER TABLE "ShopItem" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'members';
ALTER TABLE "ListingSubmission" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'members';

-- Teams
CREATE TABLE "Team" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdByUserId" TEXT NOT NULL,
  "leaderUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "approvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- User-team membership
CREATE TABLE "AppUserTeam" (
  "userId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "teamId"),
  CONSTRAINT "AppUserTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AppUserTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AppUserTeam_teamId_idx" ON "AppUserTeam"("teamId");

-- Item-team visibility mapping
CREATE TABLE "ShopItemTeam" (
  "itemId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("itemId", "teamId"),
  CONSTRAINT "ShopItemTeam_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ShopItemTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ShopItemTeam_teamId_idx" ON "ShopItemTeam"("teamId");

-- Submission-team visibility mapping
CREATE TABLE "ListingSubmissionTeam" (
  "submissionId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("submissionId", "teamId"),
  CONSTRAINT "ListingSubmissionTeam_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ListingSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ListingSubmissionTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ListingSubmissionTeam_teamId_idx" ON "ListingSubmissionTeam"("teamId");
