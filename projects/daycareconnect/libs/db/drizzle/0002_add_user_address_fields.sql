-- Add missing fields to user table for better-auth compatibility
-- These columns are defined in the schema but missing from the database

-- Address fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "address" varchar(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "city" varchar(100);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "state" varchar(50);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "zip_code" varchar(20);

-- Better-auth required fields (if missing)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "image" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean NOT NULL DEFAULT true;
