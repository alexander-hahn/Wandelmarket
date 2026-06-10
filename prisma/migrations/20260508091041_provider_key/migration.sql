/*
  Warnings:

  - You are about to drop the column `githubRepo` on the `ShopItem` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopItem" (
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
    "source" TEXT NOT NULL DEFAULT 'manual',
    "providerKey" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "installInstructions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShopItem" ("author", "category", "createdAt", "description", "downloadUrl", "id", "installInstructions", "name", "repoUrl", "source", "stars", "tags", "thumbnailUrl", "updatedAt", "version", "websiteUrl") SELECT "author", "category", "createdAt", "description", "downloadUrl", "id", "installInstructions", "name", "repoUrl", "source", "stars", "tags", "thumbnailUrl", "updatedAt", "version", "websiteUrl" FROM "ShopItem";
DROP TABLE "ShopItem";
ALTER TABLE "new_ShopItem" RENAME TO "ShopItem";
CREATE UNIQUE INDEX "ShopItem_providerKey_key" ON "ShopItem"("providerKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
