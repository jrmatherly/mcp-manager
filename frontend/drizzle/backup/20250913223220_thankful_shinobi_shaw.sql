ALTER TABLE "api_token" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "api_token" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "api_token" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_token" ALTER COLUMN "token_prefix" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "permissions" text;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "start" text;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "rate_limit_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "rate_limit_time_window" integer DEFAULT 3600000;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "rate_limit_max" integer DEFAULT 1000;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "request_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "remaining" integer;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "last_refill_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "refill_interval" integer;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "refill_amount" integer;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "last_request" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "metadata" text;--> statement-breakpoint
CREATE INDEX "api_token_enabled_idx" ON "api_token" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "api_token_last_request_idx" ON "api_token" USING btree ("last_request");--> statement-breakpoint
CREATE INDEX "api_token_rate_limit_idx" ON "api_token" USING btree ("rate_limit_enabled");