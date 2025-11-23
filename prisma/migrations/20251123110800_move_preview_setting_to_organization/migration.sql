-- Remove allowInputPreview from User (user-level setting)
ALTER TABLE "User" DROP COLUMN IF EXISTS "allowInputPreview";

-- Add storeInputPreview to Organization (org-level setting)
-- Default is false for privacy
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "storeInputPreview" BOOLEAN NOT NULL DEFAULT false;

