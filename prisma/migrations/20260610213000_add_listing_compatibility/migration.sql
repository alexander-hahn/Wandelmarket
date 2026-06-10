ALTER TABLE "ShopItem" ADD COLUMN "compatibilityOs" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ShopItem" ADD COLUMN "compatibilityAppVersions" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ShopItem" ADD COLUMN "compatibilityToolchain" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "ListingSubmission" ADD COLUMN "compatibilityOs" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ListingSubmission" ADD COLUMN "compatibilityAppVersions" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ListingSubmission" ADD COLUMN "compatibilityToolchain" TEXT NOT NULL DEFAULT '[]';
