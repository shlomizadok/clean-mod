-- Drop unique index on email if it exists (resolve drift)
DROP INDEX IF EXISTS "User_email_key";

-- AlterTable: Add allowInputPreview to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowInputPreview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add inputText and inputPreview to ModerationLog
ALTER TABLE "ModerationLog" ADD COLUMN IF NOT EXISTS "inputText" TEXT;
ALTER TABLE "ModerationLog" ADD COLUMN IF NOT EXISTS "inputPreview" TEXT;

