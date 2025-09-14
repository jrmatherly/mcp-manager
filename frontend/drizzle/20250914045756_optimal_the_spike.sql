CREATE TYPE "public"."api_key_scope" AS ENUM('read', 'write', 'admin', 'proxy', 'metrics', 'health');--> statement-breakpoint
CREATE TYPE "public"."circuit_breaker_state" AS ENUM('closed', 'open', 'half_open');--> statement-breakpoint
CREATE TYPE "public"."server_status" AS ENUM('healthy', 'unhealthy', 'degraded', 'unknown', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."transport_type" AS ENUM('http', 'websocket', 'stdio', 'sse');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"token_type" text,
	"provider_account_id" text,
	"refresh_token_rotation_enabled" boolean DEFAULT true,
	CONSTRAINT "account_provider_account_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"device_info" json,
	"last_activity_at" timestamp with time zone,
	"is_revoked" boolean DEFAULT false,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
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
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"tenant_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"preferences" json DEFAULT '{}'::json,
	"two_factor_enabled" boolean DEFAULT false,
	"backup_codes" json,
	"terms_accepted_at" timestamp with time zone,
	"privacy_accepted_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
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
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"type" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"is_used" boolean DEFAULT false
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
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug")
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
	CONSTRAINT "api_token_token_hash_unique" UNIQUE("token_hash")
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
CREATE TABLE "apiKey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"userId" text NOT NULL,
	"refillInterval" integer,
	"refillAmount" integer,
	"lastRefillAt" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"rateLimitEnabled" boolean DEFAULT true NOT NULL,
	"rateLimitTimeWindow" integer,
	"rateLimitMax" integer,
	"requestCount" integer DEFAULT 0 NOT NULL,
	"remaining" integer,
	"lastRequest" timestamp with time zone,
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"permissions" text,
	"metadata" text
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
	CONSTRAINT "feature_flag_key_unique" UNIQUE("key")
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
	CONSTRAINT "system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "circuit_breakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"state" "circuit_breaker_state" DEFAULT 'closed',
	"failure_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_threshold" integer DEFAULT 5,
	"success_threshold" integer DEFAULT 2,
	"timeout_ms" integer DEFAULT 60000,
	"last_failure_time" timestamp,
	"last_success_time" timestamp,
	"last_state_change" timestamp DEFAULT now() NOT NULL,
	"total_requests" integer DEFAULT 0,
	"total_failures" integer DEFAULT 0,
	"total_timeouts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connection_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"pool_name" varchar(255) NOT NULL,
	"transport_type" "transport_type" NOT NULL,
	"max_size" integer DEFAULT 10,
	"min_size" integer DEFAULT 2,
	"timeout_ms" integer DEFAULT 30000,
	"idle_timeout_ms" integer DEFAULT 300000,
	"active_connections" integer DEFAULT 0,
	"idle_connections" integer DEFAULT 0,
	"pending_requests" integer DEFAULT 0,
	"is_healthy" boolean DEFAULT true,
	"last_health_check" timestamp,
	"total_connections_created" integer DEFAULT 0,
	"total_connections_closed" integer DEFAULT 0,
	"connection_errors" integer DEFAULT 0,
	"avg_connection_time_ms" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"table_name" varchar(100) NOT NULL,
	"date_column" varchar(100) NOT NULL,
	"retention_days" integer NOT NULL,
	"batch_size" integer DEFAULT 1000,
	"conditions" json DEFAULT '{}'::json,
	"is_active" boolean DEFAULT true,
	"last_run" timestamp,
	"next_run" timestamp,
	"total_deleted" integer DEFAULT 0,
	"last_deleted_count" integer DEFAULT 0,
	"avg_execution_time_ms" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enhanced_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"salt" varchar(255) NOT NULL,
	"user_id" text,
	"tenant_id" text,
	"scopes" json DEFAULT '[]'::json,
	"allowed_servers" json DEFAULT '[]'::json,
	"allowed_methods" json DEFAULT '[]'::json,
	"ip_whitelist" json DEFAULT '[]'::json,
	"rate_limit_per_hour" integer DEFAULT 1000,
	"rate_limit_per_day" integer DEFAULT 10000,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"last_used" timestamp,
	"total_requests" integer DEFAULT 0,
	"total_errors" integer DEFAULT 0,
	"last_success" timestamp,
	"last_error" timestamp,
	"failed_attempts" integer DEFAULT 0,
	"last_failed_attempt" timestamp,
	"is_locked" boolean DEFAULT false,
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastmcp_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"tenant_id" varchar(255),
	"user_roles" json DEFAULT '[]'::json,
	"method" varchar(100) NOT NULL,
	"params" json DEFAULT '{}'::json,
	"request_id" varchar(255),
	"jsonrpc_version" varchar(10) DEFAULT '2.0',
	"success" boolean NOT NULL,
	"duration_ms" integer NOT NULL,
	"error_code" integer,
	"error_message" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materialized_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"query" text NOT NULL,
	"indexes" json DEFAULT '[]'::json,
	"refresh_strategy" varchar(50) DEFAULT 'manual',
	"refresh_interval_minutes" integer,
	"refresh_triggers" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true,
	"last_refreshed" timestamp,
	"next_refresh" timestamp,
	"refresh_count" integer DEFAULT 0,
	"avg_refresh_time_ms" real,
	"row_count" integer,
	"size_bytes" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"server_id" text,
	"metric_name" varchar(100) NOT NULL,
	"threshold_value" real NOT NULL,
	"comparison_operator" varchar(10) NOT NULL,
	"duration_minutes" integer DEFAULT 5,
	"is_active" boolean DEFAULT true,
	"is_triggered" boolean DEFAULT false,
	"first_triggered" timestamp,
	"last_triggered" timestamp,
	"trigger_count" integer DEFAULT 0,
	"notification_channels" json DEFAULT '[]'::json,
	"cooldown_minutes" integer DEFAULT 60,
	"last_notification" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar(255) NOT NULL,
	"user_id" text,
	"tenant_id" text,
	"ip_address" varchar(45),
	"method" varchar(10) NOT NULL,
	"path" varchar(500) NOT NULL,
	"query_params" json DEFAULT '{}'::json,
	"headers" json DEFAULT '{}'::json,
	"target_server_id" text,
	"request_time" timestamp DEFAULT now() NOT NULL,
	"response_time" timestamp,
	"duration_ms" real,
	"status_code" integer,
	"response_size_bytes" integer,
	"error_type" varchar(100),
	"error_message" text,
	"request_metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"queue_name" varchar(255) NOT NULL,
	"max_size" integer DEFAULT 1000,
	"processing_timeout_ms" integer DEFAULT 60000,
	"priority_levels" integer DEFAULT 3,
	"current_size" integer DEFAULT 0,
	"processing_count" integer DEFAULT 0,
	"is_accepting_requests" boolean DEFAULT true,
	"last_processed" timestamp,
	"total_enqueued" integer DEFAULT 0,
	"total_processed" integer DEFAULT 0,
	"total_timeouts" integer DEFAULT 0,
	"total_errors" integer DEFAULT 0,
	"avg_processing_time_ms" real,
	"avg_wait_time_ms" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_access_control" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"user_id" text,
	"tenant_id" text,
	"api_key_id" uuid,
	"can_read" boolean DEFAULT true,
	"can_write" boolean DEFAULT false,
	"can_admin" boolean DEFAULT false,
	"can_proxy" boolean DEFAULT true,
	"allowed_methods" json DEFAULT '[]'::json,
	"denied_methods" json DEFAULT '[]'::json,
	"access_start_time" timestamp,
	"access_end_time" timestamp,
	"allowed_days" json DEFAULT '[]'::json,
	"allowed_hours" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true,
	"last_access" timestamp,
	"access_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"response_time_ms" real,
	"requests_per_second" real,
	"error_rate" real,
	"cpu_usage" real,
	"memory_usage_mb" real,
	"active_connections" integer,
	"connection_pool_size" integer,
	"custom_metrics" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"expires_at" timestamp NOT NULL,
	"session_data" json DEFAULT '{}'::json,
	"is_active" boolean DEFAULT true,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "circuit_breakers" ADD CONSTRAINT "circuit_breakers_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_pools" ADD CONSTRAINT "connection_pools_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enhanced_api_keys" ADD CONSTRAINT "enhanced_api_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enhanced_api_keys" ADD CONSTRAINT "enhanced_api_keys_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_alerts" ADD CONSTRAINT "performance_alerts_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_target_server_id_mcp_server_id_fk" FOREIGN KEY ("target_server_id") REFERENCES "public"."mcp_server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_queues" ADD CONSTRAINT "request_queues_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_access_control" ADD CONSTRAINT "server_access_control_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_access_control" ADD CONSTRAINT "server_access_control_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_access_control" ADD CONSTRAINT "server_access_control_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_access_control" ADD CONSTRAINT "server_access_control_api_key_id_enhanced_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."enhanced_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_metrics" ADD CONSTRAINT "server_metrics_server_id_mcp_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "session_active_idx" ON "session" USING btree ("is_revoked");--> statement-breakpoint
CREATE INDEX "session_last_activity_idx" ON "session" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "two_factor_enabled_idx" ON "two_factor_auth" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_tenant_idx" ON "user" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_active_idx" ON "user" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_last_login_idx" ON "user" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX "user_permission_user_idx" ON "user_permission" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_permission_permission_idx" ON "user_permission" USING btree ("permission");--> statement-breakpoint
CREATE INDEX "user_permission_resource_idx" ON "user_permission" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "user_permission_expires_idx" ON "user_permission" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_type_idx" ON "verification" USING btree ("type");--> statement-breakpoint
CREATE INDEX "verification_expires_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_used_idx" ON "verification" USING btree ("is_used");--> statement-breakpoint
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
CREATE INDEX "idx_mcp_resources_uri_server" ON "mcp_resource" USING btree ("uri","server_id");--> statement-breakpoint
CREATE INDEX "mcp_server_name_idx" ON "mcp_server" USING btree ("name");--> statement-breakpoint
CREATE INDEX "mcp_server_status_idx" ON "mcp_server" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mcp_server_health_idx" ON "mcp_server" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "mcp_server_tenant_idx" ON "mcp_server" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mcp_server_owner_idx" ON "mcp_server" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "mcp_server_public_idx" ON "mcp_server" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "mcp_server_category_idx" ON "mcp_server" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mcp_server_last_used_idx" ON "mcp_server" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_tenant_status" ON "mcp_server" USING btree ("tenant_id","health_status");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_endpoint_transport" ON "mcp_server" USING btree ("endpoint_url","transport_type");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_health_check_time" ON "mcp_server" USING btree ("last_health_check");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_performance" ON "mcp_server" USING btree ("avg_response_time","uptime");--> statement-breakpoint
CREATE INDEX "idx_servers_discovery_composite" ON "mcp_server" USING btree ("health_status","transport_type","avg_response_time");--> statement-breakpoint
CREATE INDEX "mcp_server_dependency_server_idx" ON "mcp_server_dependency" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_server_dependency_depends_on_idx" ON "mcp_server_dependency" USING btree ("depends_on_server_id");--> statement-breakpoint
CREATE INDEX "mcp_server_health_check_server_idx" ON "mcp_server_health_check" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_server_health_check_status_idx" ON "mcp_server_health_check" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mcp_server_health_check_checked_at_idx" ON "mcp_server_health_check" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "mcp_tool_server_idx" ON "mcp_tool" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_tool_name_idx" ON "mcp_tool" USING btree ("name");--> statement-breakpoint
CREATE INDEX "mcp_tool_category_idx" ON "mcp_tool" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mcp_tool_active_idx" ON "mcp_tool" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_mcp_tools_name_server" ON "mcp_tool" USING btree ("name","server_id");--> statement-breakpoint
CREATE INDEX "idx_mcp_tools_usage_stats" ON "mcp_tool" USING btree ("call_count","error_count");--> statement-breakpoint
CREATE INDEX "idx_tools_discovery_performance" ON "mcp_tool" USING btree ("name","call_count","avg_execution_time","server_id");--> statement-breakpoint
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
CREATE INDEX "circuit_breakers_server_idx" ON "circuit_breakers" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "circuit_breakers_service_idx" ON "circuit_breakers" USING btree ("service_name");--> statement-breakpoint
CREATE INDEX "circuit_breakers_state_idx" ON "circuit_breakers" USING btree ("state");--> statement-breakpoint
CREATE INDEX "circuit_breakers_last_change_idx" ON "circuit_breakers" USING btree ("last_state_change");--> statement-breakpoint
CREATE INDEX "connection_pools_server_idx" ON "connection_pools" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "connection_pools_name_idx" ON "connection_pools" USING btree ("pool_name");--> statement-breakpoint
CREATE INDEX "connection_pools_healthy_idx" ON "connection_pools" USING btree ("is_healthy");--> statement-breakpoint
CREATE UNIQUE INDEX "data_retention_name_unique" ON "data_retention_policies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "data_retention_table_idx" ON "data_retention_policies" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "data_retention_active_idx" ON "data_retention_policies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "data_retention_last_run_idx" ON "data_retention_policies" USING btree ("last_run");--> statement-breakpoint
CREATE INDEX "data_retention_next_run_idx" ON "data_retention_policies" USING btree ("next_run");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_name_idx" ON "enhanced_api_keys" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "enhanced_api_keys_hash_unique" ON "enhanced_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_prefix_idx" ON "enhanced_api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_user_idx" ON "enhanced_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_tenant_idx" ON "enhanced_api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_active_idx" ON "enhanced_api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_expires_idx" ON "enhanced_api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_last_used_idx" ON "enhanced_api_keys" USING btree ("last_used");--> statement-breakpoint
CREATE INDEX "enhanced_api_keys_locked_idx" ON "enhanced_api_keys" USING btree ("is_locked");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_user_idx" ON "fastmcp_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_tenant_idx" ON "fastmcp_audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_method_idx" ON "fastmcp_audit_log" USING btree ("method");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_success_idx" ON "fastmcp_audit_log" USING btree ("success");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_timestamp_idx" ON "fastmcp_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_user_time_idx" ON "fastmcp_audit_log" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_method_success_idx" ON "fastmcp_audit_log" USING btree ("method","success","timestamp");--> statement-breakpoint
CREATE INDEX "fastmcp_audit_tenant_performance_idx" ON "fastmcp_audit_log" USING btree ("tenant_id","duration_ms","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "materialized_views_name_unique" ON "materialized_views" USING btree ("name");--> statement-breakpoint
CREATE INDEX "materialized_views_active_idx" ON "materialized_views" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "materialized_views_last_refresh_idx" ON "materialized_views" USING btree ("last_refreshed");--> statement-breakpoint
CREATE INDEX "materialized_views_next_refresh_idx" ON "materialized_views" USING btree ("next_refresh");--> statement-breakpoint
CREATE INDEX "performance_alerts_name_idx" ON "performance_alerts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "performance_alerts_server_idx" ON "performance_alerts" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "performance_alerts_metric_idx" ON "performance_alerts" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "performance_alerts_active_idx" ON "performance_alerts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "performance_alerts_triggered_idx" ON "performance_alerts" USING btree ("is_triggered");--> statement-breakpoint
CREATE UNIQUE INDEX "request_logs_request_id_unique" ON "request_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "request_logs_user_idx" ON "request_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "request_logs_tenant_idx" ON "request_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "request_logs_ip_idx" ON "request_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "request_logs_path_idx" ON "request_logs" USING btree ("path");--> statement-breakpoint
CREATE INDEX "request_logs_server_idx" ON "request_logs" USING btree ("target_server_id");--> statement-breakpoint
CREATE INDEX "request_logs_time_idx" ON "request_logs" USING btree ("request_time");--> statement-breakpoint
CREATE INDEX "request_logs_status_idx" ON "request_logs" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "request_logs_tenant_time_idx" ON "request_logs" USING btree ("tenant_id","request_time");--> statement-breakpoint
CREATE INDEX "request_logs_server_performance_idx" ON "request_logs" USING btree ("target_server_id","duration_ms","status_code");--> statement-breakpoint
CREATE INDEX "request_queues_server_idx" ON "request_queues" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "request_queues_name_idx" ON "request_queues" USING btree ("queue_name");--> statement-breakpoint
CREATE INDEX "request_queues_size_idx" ON "request_queues" USING btree ("current_size");--> statement-breakpoint
CREATE INDEX "request_queues_accepting_idx" ON "request_queues" USING btree ("is_accepting_requests");--> statement-breakpoint
CREATE INDEX "server_access_server_idx" ON "server_access_control" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "server_access_user_idx" ON "server_access_control" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "server_access_tenant_idx" ON "server_access_control" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "server_access_api_key_idx" ON "server_access_control" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "server_access_active_idx" ON "server_access_control" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "server_metrics_server_idx" ON "server_metrics" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "server_metrics_timestamp_idx" ON "server_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "server_metrics_server_time_idx" ON "server_metrics" USING btree ("server_id","timestamp");--> statement-breakpoint
CREATE INDEX "server_metrics_performance_idx" ON "server_metrics" USING btree ("response_time_ms","error_rate");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "sessions_active_idx" ON "sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_last_activity_idx" ON "sessions" USING btree ("last_activity");