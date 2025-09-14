ALTER TABLE "api_token" ALTER COLUMN "remaining" SET DEFAULT 1000;--> statement-breakpoint
ALTER TABLE "api_token" ALTER COLUMN "refill_interval" SET DEFAULT 3600000;--> statement-breakpoint
ALTER TABLE "api_token" ALTER COLUMN "refill_amount" SET DEFAULT 1000;