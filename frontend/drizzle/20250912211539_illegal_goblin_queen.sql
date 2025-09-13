CREATE TABLE "two_factor_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"backup_codes" json,
	"created_at" timestamp with time zone NOT NULL,
	"enabled_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "two_factor_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"permission" text NOT NULL,
	"resource" text,
	"granted_at" timestamp with time zone NOT NULL,
	"granted_by" text,
	"expires_at" timestamp with time zone,
	CONSTRAINT "user_permission_unique" UNIQUE("user_id","permission","resource")
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"owner_id" text NOT NULL,
	"billing_email" text,
	"max_users" integer DEFAULT 10,
	"max_servers" integer DEFAULT 5,
	"max_api_calls" integer DEFAULT 10000,
	"features" json DEFAULT '{}'::json,
	"settings" json DEFAULT '{}'::json,
	"current_users" integer DEFAULT 0,
	"current_servers" integer DEFAULT 0,
	"current_month_api_calls" integer DEFAULT 0,
	"plan_type" text DEFAULT 'free' NOT NULL,
	"subscription_status" text DEFAULT 'active',
	"subscription_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"data_region" text DEFAULT 'us-east-1',
	"encryption_key_id" text,
	"audit_log_retention" integer DEFAULT 90,
	"contact_email" text,
	"contact_phone" text,
	"support_plan" text DEFAULT 'community',
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenant_slug_unique_idx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenant_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"invited_by" text NOT NULL,
	"message" text,
	CONSTRAINT "tenant_invitation_token_unique" UNIQUE("token"),
	CONSTRAINT "tenant_invitation_token_unique_idx" UNIQUE("token"),
	CONSTRAINT "tenant_invitation_tenant_email_unique_idx" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE "tenant_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"joined_at" timestamp with time zone,
	"invited_at" timestamp with time zone NOT NULL,
	"invited_by" text,
	"permissions" json DEFAULT '{}'::json,
	"ip_whitelist" json,
	"last_access_at" timestamp with time zone,
	CONSTRAINT "tenant_member_tenant_user_unique_idx" UNIQUE("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"api_calls" integer DEFAULT 0,
	"storage_bytes" integer DEFAULT 0,
	"active_users" integer DEFAULT 0,
	"active_servers" integer DEFAULT 0,
	"usage_details" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tenant_usage_tenant_period_unique_idx" UNIQUE("tenant_id","period_start","period_end")
);
--> statement-breakpoint
CREATE TABLE "mcp_prompt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template" text NOT NULL,
	"arguments" json DEFAULT '[]'::json,
	"tags" json DEFAULT '[]'::json,
	"category" text,
	"use_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "mcp_prompt_server_name_unique" UNIQUE("server_id","name")
);
--> statement-breakpoint
CREATE TABLE "mcp_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"uri" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"mime_type" text,
	"size" integer,
	"annotations" json,
	"content_type" text DEFAULT 'text',
	"access_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_accessed_at" timestamp with time zone,
	CONSTRAINT "mcp_resource_server_uri_unique" UNIQUE("server_id","uri")
);
--> statement-breakpoint
CREATE TABLE "mcp_server" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"transport_type" text NOT NULL,
	"auth_type" text DEFAULT 'none' NOT NULL,
	"auth_config" json,
	"status" text DEFAULT 'inactive' NOT NULL,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"last_health_check" timestamp with time zone,
	"health_check_interval" integer DEFAULT 300,
	"capabilities" json DEFAULT '{}'::json,
	"tags" json DEFAULT '[]'::json,
	"category" text,
	"tenant_id" text,
	"owner_id" text NOT NULL,
	"is_public" boolean DEFAULT false,
	"request_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"avg_response_time" numeric(10, 3),
	"uptime" numeric(5, 2) DEFAULT '100.00',
	"settings" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mcp_server_dependency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"depends_on_server_id" text NOT NULL,
	"dependency_type" text DEFAULT 'required' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mcp_server_dependency_unique" UNIQUE("server_id","depends_on_server_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_server_health_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"status" text NOT NULL,
	"response_time" integer,
	"error_message" text,
	"metrics" json,
	"checked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_tool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"input_schema" json,
	"tags" json DEFAULT '[]'::json,
	"category" text,
	"call_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"avg_execution_time" numeric(10, 3),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "mcp_tool_server_name_unique" UNIQUE("server_id","name")
);
--> statement-breakpoint
CREATE TABLE "api_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text,
	"scopes" json DEFAULT '[]'::json,
	"type" text DEFAULT 'personal' NOT NULL,
	"allowed_ips" json,
	"allowed_domains" json,
	"rate_limit" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "api_token_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "api_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid,
	"user_id" text,
	"tenant_id" text,
	"server_id" text,
	"path" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer,
	"request_size" integer,
	"response_size" integer,
	"ip_address" text,
	"user_agent" text,
	"country" text,
	"region" text,
	"city" text,
	"error_code" text,
	"error_message" text,
	"metadata" json,
	"requested_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text,
	"user_id" text,
	"server_id" text,
	"token_id" uuid,
	"period_type" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"total_requests" integer DEFAULT 0,
	"total_errors" integer DEFAULT 0,
	"avg_response_time" numeric(10, 3),
	"total_data_transfer" integer DEFAULT 0,
	"unique_ips" integer DEFAULT 0,
	"status_breakdown" json DEFAULT '{}'::json,
	"endpoint_breakdown" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rules" json DEFAULT '[]'::json,
	"scope" text NOT NULL,
	"priority" integer DEFAULT 100,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_violation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid,
	"user_id" text,
	"tenant_id" text,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"path" text NOT NULL,
	"method" text NOT NULL,
	"rule_id" uuid,
	"limit_type" text NOT NULL,
	"limit_value" integer NOT NULL,
	"current_value" integer NOT NULL,
	"action" text NOT NULL,
	"metadata" json,
	"violated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"action" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"actor_ip" text,
	"actor_user_agent" text,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"resource_name" text,
	"tenant_id" text,
	"session_id" text,
	"request_id" text,
	"trace_id" text,
	"description" text NOT NULL,
	"changes" json,
	"http_method" text,
	"http_path" text,
	"http_status_code" integer,
	"response_time" integer,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"compliance_relevant" boolean DEFAULT false,
	"metadata" json,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"error_code" text,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"error_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"user_id" text,
	"tenant_id" text,
	"session_id" text,
	"request_id" text,
	"trace_id" text,
	"http_method" text,
	"http_path" text,
	"http_headers" json,
	"http_query" json,
	"http_body" json,
	"service" text NOT NULL,
	"version" text,
	"environment" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"device_info" json,
	"level" text DEFAULT 'error' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"resolution" text,
	"first_seen" timestamp with time zone NOT NULL,
	"last_seen" timestamp with time zone NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"source_ip" text NOT NULL,
	"user_agent" text,
	"user_id" text,
	"tenant_id" text,
	"country" text,
	"region" text,
	"city" text,
	"description" text NOT NULL,
	"details" json DEFAULT '{}'::json,
	"action_taken" text DEFAULT 'logged' NOT NULL,
	"investigation_status" text DEFAULT 'pending' NOT NULL,
	"investigated_by" text,
	"investigation_notes" text,
	"detected_at" timestamp with time zone NOT NULL,
	"investigated_at" timestamp with time zone,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"source" text NOT NULL,
	"tenant_id" text,
	"resource_type" text,
	"resource_id" text,
	"data" json DEFAULT '{}'::json,
	"status" text DEFAULT 'active' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"notification_sent" boolean DEFAULT false,
	"notification_channels" json DEFAULT '[]'::json,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_acknowledgment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"acknowledged_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "announcement_acknowledgment_unique_idx" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "feature_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'boolean' NOT NULL,
	"default_value" json NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0,
	"targeting_rules" json DEFAULT '[]'::json,
	"environments" json DEFAULT '{}'::json,
	"status" text DEFAULT 'development' NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"owner" text,
	"expires_at" timestamp with time zone,
	"kill_switch_enabled" boolean DEFAULT false,
	"last_modified_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "feature_flag_name_unique" UNIQUE("name"),
	CONSTRAINT "feature_flag_key_unique" UNIQUE("key"),
	CONSTRAINT "feature_flag_name_unique_idx" UNIQUE("name"),
	CONSTRAINT "feature_flag_key_unique_idx" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "feature_flag_evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_id" uuid NOT NULL,
	"flag_key" text NOT NULL,
	"user_id" text,
	"tenant_id" text,
	"value" json NOT NULL,
	"reason" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"metadata" json DEFAULT '{}'::json,
	"evaluated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_window" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"impact" text NOT NULL,
	"affected_services" json DEFAULT '[]'::json,
	"affected_tenants" json DEFAULT '[]'::json,
	"scheduled_start" timestamp with time zone NOT NULL,
	"scheduled_end" timestamp with time zone NOT NULL,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notify_users" boolean DEFAULT true,
	"notification_sent" boolean DEFAULT false,
	"notification_channels" json DEFAULT '[]'::json,
	"workarounds" text,
	"rollback_plan" text,
	"created_by" text NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"target_audience" text DEFAULT 'all_users' NOT NULL,
	"target_tenants" json DEFAULT '[]'::json,
	"target_users" json DEFAULT '[]'::json,
	"target_roles" json DEFAULT '[]'::json,
	"display_location" json DEFAULT '[]'::json,
	"is_dismissible" boolean DEFAULT true,
	"requires_acknowledgment" boolean DEFAULT false,
	"background_color" text,
	"text_color" text,
	"icon" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"action_url" text,
	"action_text" text,
	"view_count" integer DEFAULT 0,
	"acknowledgment_count" integer DEFAULT 0,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"category" text NOT NULL,
	"value" json NOT NULL,
	"value_type" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"is_secret" boolean DEFAULT false,
	"validation_schema" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"environment" text DEFAULT 'all' NOT NULL,
	"last_modified_by" text,
	"change_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "system_config_key_unique" UNIQUE("key"),
	CONSTRAINT "system_config_key_unique_idx" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "banned" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "ban_expires" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "token_type" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "provider_account_id" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refresh_token_rotation_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "device_info" json;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "is_revoked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "revoked_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "preferences" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "backup_codes" json;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "privacy_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "attempts" text DEFAULT '0';--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "max_attempts" text DEFAULT '3';--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "is_used" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "two_factor_auth" ADD CONSTRAINT "two_factor_auth_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitation" ADD CONSTRAINT "tenant_invitation_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_member" ADD CONSTRAINT "tenant_member_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_usage" ADD CONSTRAINT "tenant_usage_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_prompt" ADD CONSTRAINT "mcp_prompt_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_resource" ADD CONSTRAINT "mcp_resource_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_server_dependency" ADD CONSTRAINT "mcp_server_dependency_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_server_dependency" ADD CONSTRAINT "mcp_server_dependency_depends_on_server_id_mcp_server_id_fk" FOREIGN KEY ("depends_on_server_id") REFERENCES "public"."mcp_server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_server_health_check" ADD CONSTRAINT "mcp_server_health_check_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tool" ADD CONSTRAINT "mcp_tool_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_acknowledgment" ADD CONSTRAINT "announcement_acknowledgment_announcement_id_system_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."system_announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_evaluation" ADD CONSTRAINT "feature_flag_evaluation_flag_id_feature_flag_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "two_factor_enabled_idx" ON "two_factor_auth" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "user_permission_user_idx" ON "user_permission" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_permission_permission_idx" ON "user_permission" USING btree ("permission");--> statement-breakpoint
CREATE INDEX "user_permission_resource_idx" ON "user_permission" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "user_permission_expires_idx" ON "user_permission" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tenant_domain_idx" ON "tenant" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "tenant_status_idx" ON "tenant" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenant_owner_idx" ON "tenant" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tenant_plan_idx" ON "tenant" USING btree ("plan_type");--> statement-breakpoint
CREATE INDEX "tenant_region_idx" ON "tenant" USING btree ("data_region");--> statement-breakpoint
CREATE INDEX "tenant_invitation_tenant_idx" ON "tenant_invitation" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_invitation_status_idx" ON "tenant_invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenant_invitation_expires_idx" ON "tenant_invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tenant_member_tenant_idx" ON "tenant_member" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_member_user_idx" ON "tenant_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tenant_member_status_idx" ON "tenant_member" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenant_member_role_idx" ON "tenant_member" USING btree ("role");--> statement-breakpoint
CREATE INDEX "tenant_usage_tenant_idx" ON "tenant_usage" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_usage_period_idx" ON "tenant_usage" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "mcp_prompt_server_idx" ON "mcp_prompt" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_prompt_name_idx" ON "mcp_prompt" USING btree ("name");--> statement-breakpoint
CREATE INDEX "mcp_prompt_category_idx" ON "mcp_prompt" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mcp_prompt_active_idx" ON "mcp_prompt" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "mcp_resource_server_idx" ON "mcp_resource" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_resource_uri_idx" ON "mcp_resource" USING btree ("uri");--> statement-breakpoint
CREATE INDEX "mcp_resource_name_idx" ON "mcp_resource" USING btree ("name");--> statement-breakpoint
CREATE INDEX "mcp_resource_mime_type_idx" ON "mcp_resource" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "mcp_resource_active_idx" ON "mcp_resource" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "mcp_server_name_idx" ON "mcp_server" USING btree ("name");--> statement-breakpoint
CREATE INDEX "mcp_server_status_idx" ON "mcp_server" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mcp_server_health_idx" ON "mcp_server" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "mcp_server_tenant_idx" ON "mcp_server" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mcp_server_owner_idx" ON "mcp_server" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "mcp_server_public_idx" ON "mcp_server" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "mcp_server_category_idx" ON "mcp_server" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mcp_server_last_used_idx" ON "mcp_server" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "mcp_server_dependency_server_idx" ON "mcp_server_dependency" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_server_dependency_depends_on_idx" ON "mcp_server_dependency" USING btree ("depends_on_server_id");--> statement-breakpoint
CREATE INDEX "mcp_server_health_check_server_idx" ON "mcp_server_health_check" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_server_health_check_status_idx" ON "mcp_server_health_check" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mcp_server_health_check_checked_at_idx" ON "mcp_server_health_check" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "mcp_tool_server_idx" ON "mcp_tool" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_tool_name_idx" ON "mcp_tool" USING btree ("name");--> statement-breakpoint
CREATE INDEX "mcp_tool_category_idx" ON "mcp_tool" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mcp_tool_active_idx" ON "mcp_tool" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "api_token_user_idx" ON "api_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_token_tenant_idx" ON "api_token" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_token_active_idx" ON "api_token" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "api_token_expires_idx" ON "api_token" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "api_token_last_used_idx" ON "api_token" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "api_usage_token_idx" ON "api_usage" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "api_usage_user_idx" ON "api_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_usage_tenant_idx" ON "api_usage" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_usage_server_idx" ON "api_usage" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "api_usage_path_idx" ON "api_usage" USING btree ("path");--> statement-breakpoint
CREATE INDEX "api_usage_status_idx" ON "api_usage" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "api_usage_requested_at_idx" ON "api_usage" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "api_usage_stats_tenant_period_idx" ON "api_usage_stats" USING btree ("tenant_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "api_usage_stats_user_period_idx" ON "api_usage_stats" USING btree ("user_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "api_usage_stats_server_period_idx" ON "api_usage_stats" USING btree ("server_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "api_usage_stats_token_period_idx" ON "api_usage_stats" USING btree ("token_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "api_usage_stats_period_range_idx" ON "api_usage_stats" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "rate_limit_config_name_idx" ON "rate_limit_config" USING btree ("name");--> statement-breakpoint
CREATE INDEX "rate_limit_config_scope_idx" ON "rate_limit_config" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "rate_limit_config_priority_idx" ON "rate_limit_config" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "rate_limit_config_active_idx" ON "rate_limit_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "rate_limit_violation_token_idx" ON "rate_limit_violation" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "rate_limit_violation_user_idx" ON "rate_limit_violation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rate_limit_violation_tenant_idx" ON "rate_limit_violation" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "rate_limit_violation_ip_idx" ON "rate_limit_violation" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "rate_limit_violation_path_idx" ON "rate_limit_violation" USING btree ("path");--> statement-breakpoint
CREATE INDEX "rate_limit_violation_violated_at_idx" ON "rate_limit_violation" USING btree ("violated_at");--> statement-breakpoint
CREATE INDEX "audit_log_event_type_idx" ON "audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_idx" ON "audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_log_occurred_at_idx" ON "audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_risk_level_idx" ON "audit_log" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "audit_log_compliance_idx" ON "audit_log" USING btree ("compliance_relevant");--> statement-breakpoint
CREATE INDEX "audit_log_success_idx" ON "audit_log" USING btree ("success");--> statement-breakpoint
CREATE INDEX "error_log_error_id_idx" ON "error_log" USING btree ("error_id");--> statement-breakpoint
CREATE INDEX "error_log_fingerprint_idx" ON "error_log" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "error_log_type_idx" ON "error_log" USING btree ("type");--> statement-breakpoint
CREATE INDEX "error_log_user_idx" ON "error_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_log_tenant_idx" ON "error_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "error_log_service_idx" ON "error_log" USING btree ("service");--> statement-breakpoint
CREATE INDEX "error_log_level_idx" ON "error_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "error_log_status_idx" ON "error_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "error_log_first_seen_idx" ON "error_log" USING btree ("first_seen");--> statement-breakpoint
CREATE INDEX "error_log_last_seen_idx" ON "error_log" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "security_event_type_idx" ON "security_event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "security_event_severity_idx" ON "security_event" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_event_source_ip_idx" ON "security_event" USING btree ("source_ip");--> statement-breakpoint
CREATE INDEX "security_event_user_idx" ON "security_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_event_tenant_idx" ON "security_event" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "security_event_action_idx" ON "security_event" USING btree ("action_taken");--> statement-breakpoint
CREATE INDEX "security_event_status_idx" ON "security_event" USING btree ("investigation_status");--> statement-breakpoint
CREATE INDEX "security_event_detected_at_idx" ON "security_event" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "system_event_type_idx" ON "system_event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "system_event_category_idx" ON "system_event" USING btree ("category");--> statement-breakpoint
CREATE INDEX "system_event_severity_idx" ON "system_event" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "system_event_source_idx" ON "system_event" USING btree ("source");--> statement-breakpoint
CREATE INDEX "system_event_tenant_idx" ON "system_event" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_event_status_idx" ON "system_event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_event_occurred_at_idx" ON "system_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "announcement_acknowledgment_announcement_idx" ON "announcement_acknowledgment" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_acknowledgment_user_idx" ON "announcement_acknowledgment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feature_flag_status_idx" ON "feature_flag" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feature_flag_enabled_idx" ON "feature_flag" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "feature_flag_expires_idx" ON "feature_flag" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "feature_flag_evaluation_flag_idx" ON "feature_flag_evaluation" USING btree ("flag_id");--> statement-breakpoint
CREATE INDEX "feature_flag_evaluation_flag_key_idx" ON "feature_flag_evaluation" USING btree ("flag_key");--> statement-breakpoint
CREATE INDEX "feature_flag_evaluation_user_idx" ON "feature_flag_evaluation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feature_flag_evaluation_tenant_idx" ON "feature_flag_evaluation" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "feature_flag_evaluation_evaluated_at_idx" ON "feature_flag_evaluation" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "maintenance_window_type_idx" ON "maintenance_window" USING btree ("type");--> statement-breakpoint
CREATE INDEX "maintenance_window_status_idx" ON "maintenance_window" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_window_scheduled_start_idx" ON "maintenance_window" USING btree ("scheduled_start");--> statement-breakpoint
CREATE INDEX "maintenance_window_scheduled_end_idx" ON "maintenance_window" USING btree ("scheduled_end");--> statement-breakpoint
CREATE INDEX "system_announcement_type_idx" ON "system_announcement" USING btree ("type");--> statement-breakpoint
CREATE INDEX "system_announcement_priority_idx" ON "system_announcement" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "system_announcement_active_idx" ON "system_announcement" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "system_announcement_starts_at_idx" ON "system_announcement" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "system_announcement_ends_at_idx" ON "system_announcement" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "system_config_category_idx" ON "system_config" USING btree ("category");--> statement-breakpoint
CREATE INDEX "system_config_public_idx" ON "system_config" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "system_config_active_idx" ON "system_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "system_config_environment_idx" ON "system_config" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "session_active_idx" ON "session" USING btree ("is_revoked");--> statement-breakpoint
CREATE INDEX "session_last_activity_idx" ON "session" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_tenant_idx" ON "user" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_active_idx" ON "user" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_last_login_idx" ON "user" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_type_idx" ON "verification" USING btree ("type");--> statement-breakpoint
CREATE INDEX "verification_expires_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_used_idx" ON "verification" USING btree ("is_used");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_provider_account_unique" UNIQUE("provider_id","account_id");