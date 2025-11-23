-- Drop the inputText column from ModerationLog
-- This removes full text storage for privacy
ALTER TABLE "ModerationLog" DROP COLUMN IF EXISTS "inputText";

