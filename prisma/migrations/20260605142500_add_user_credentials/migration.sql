ALTER TABLE "AppUser" ADD COLUMN "firstName" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "lastName" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "email" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
