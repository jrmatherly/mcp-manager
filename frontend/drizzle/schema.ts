import { pgTable, index, text, timestamp, integer, boolean, unique, uuid, json, numeric, uniqueIndex, varchar, real, bigint, foreignKey, doublePrecision, pgView, pgMaterializedView, date, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const api_key_scope = pgEnum("api_key_scope", ['read', 'write', 'admin', 'proxy', 'metrics', 'health'])
export const circuit_breaker_state = pgEnum("circuit_breaker_state", ['closed', 'open', 'half_open'])
export const circuitbreakerstate = pgEnum("circuitbreakerstate", ['CLOSED', 'OPEN', 'HALF_OPEN'])
export const server_status = pgEnum("server_status", ['healthy', 'unhealthy', 'degraded', 'unknown', 'maintenance'])
export const serverstatus = pgEnum("serverstatus", ['HEALTHY', 'UNHEALTHY', 'DEGRADED', 'UNKNOWN', 'MAINTENANCE'])
export const tenantstatus = pgEnum("tenantstatus", ['ACTIVE', 'SUSPENDED', 'DISABLED'])
export const transport_type = pgEnum("transport_type", ['http', 'websocket', 'stdio', 'sse'])
export const transporttype = pgEnum("transporttype", ['HTTP', 'WEBSOCKET', 'STDIO', 'SSE'])
export const userrole = pgEnum("userrole", ['ADMIN', 'USER', 'SERVICE', 'READONLY'])


export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	type: text(),
	attempts: integer().default(0),
	max_attempts: integer().default(3),
	is_used: boolean().default(false),
}, (table) => [
	index("verification_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamptz_ops")),
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
	index("verification_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("verification_used_idx").using("btree", table.is_used.asc().nullsLast().op("bool_ops")),
]);

export const api_token = pgTable("api_token", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	token_hash: text().notNull(),
	token_prefix: text().notNull(),
	user_id: text().notNull(),
	tenant_id: text(),
	scopes: json().default([]),
	type: text().default('personal').notNull(),
	allowed_ips: json(),
	allowed_domains: json(),
	rate_limit: json(),
	is_active: boolean().default(true).notNull(),
	last_used_at: timestamp({ withTimezone: true, mode: 'string' }),
	usage_count: integer().default(0),
	expires_at: timestamp({ withTimezone: true, mode: 'string' }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("api_token_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("api_token_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamptz_ops")),
	index("api_token_last_used_idx").using("btree", table.last_used_at.asc().nullsLast().op("timestamptz_ops")),
	index("api_token_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("api_token_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	unique("api_token_token_hash_unique").on(table.token_hash),
]);

export const api_usage = pgTable("api_usage", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	token_id: uuid(),
	user_id: text(),
	tenant_id: text(),
	server_id: text(),
	path: text().notNull(),
	method: text().notNull(),
	status_code: integer().notNull(),
	response_time: integer(),
	request_size: integer(),
	response_size: integer(),
	ip_address: text(),
	user_agent: text(),
	country: text(),
	region: text(),
	city: text(),
	error_code: text(),
	error_message: text(),
	metadata: json(),
	requested_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("api_usage_path_idx").using("btree", table.path.asc().nullsLast().op("text_ops")),
	index("api_usage_requested_at_idx").using("btree", table.requested_at.asc().nullsLast().op("timestamptz_ops")),
	index("api_usage_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("api_usage_status_idx").using("btree", table.status_code.asc().nullsLast().op("int4_ops")),
	index("api_usage_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("api_usage_token_idx").using("btree", table.token_id.asc().nullsLast().op("uuid_ops")),
	index("api_usage_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
]);

export const api_usage_stats = pgTable("api_usage_stats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenant_id: text(),
	user_id: text(),
	server_id: text(),
	token_id: uuid(),
	period_type: text().notNull(),
	period_start: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	period_end: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	total_requests: integer().default(0),
	total_errors: integer().default(0),
	avg_response_time: numeric({ precision: 10, scale:  3 }),
	total_data_transfer: integer().default(0),
	unique_ips: integer().default(0),
	status_breakdown: json().default({}),
	endpoint_breakdown: json().default({}),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("api_usage_stats_period_range_idx").using("btree", table.period_start.asc().nullsLast().op("timestamptz_ops"), table.period_end.asc().nullsLast().op("timestamptz_ops")),
	index("api_usage_stats_server_period_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops"), table.period_type.asc().nullsLast().op("timestamptz_ops"), table.period_start.asc().nullsLast().op("timestamptz_ops")),
	index("api_usage_stats_tenant_period_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops"), table.period_type.asc().nullsLast().op("timestamptz_ops"), table.period_start.asc().nullsLast().op("timestamptz_ops")),
	index("api_usage_stats_token_period_idx").using("btree", table.token_id.asc().nullsLast().op("timestamptz_ops"), table.period_type.asc().nullsLast().op("text_ops"), table.period_start.asc().nullsLast().op("text_ops")),
	index("api_usage_stats_user_period_idx").using("btree", table.user_id.asc().nullsLast().op("timestamptz_ops"), table.period_type.asc().nullsLast().op("timestamptz_ops"), table.period_start.asc().nullsLast().op("timestamptz_ops")),
]);

export const rate_limit_config = pgTable("rate_limit_config", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	rules: json().default([]),
	scope: text().notNull(),
	priority: integer().default(100),
	is_active: boolean().default(true).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("rate_limit_config_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("rate_limit_config_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("rate_limit_config_priority_idx").using("btree", table.priority.asc().nullsLast().op("int4_ops")),
	index("rate_limit_config_scope_idx").using("btree", table.scope.asc().nullsLast().op("text_ops")),
]);

export const rate_limit_violation = pgTable("rate_limit_violation", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	token_id: uuid(),
	user_id: text(),
	tenant_id: text(),
	ip_address: text().notNull(),
	user_agent: text(),
	path: text().notNull(),
	method: text().notNull(),
	rule_id: uuid(),
	limit_type: text().notNull(),
	limit_value: integer().notNull(),
	current_value: integer().notNull(),
	action: text().notNull(),
	metadata: json(),
	violated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("rate_limit_violation_ip_idx").using("btree", table.ip_address.asc().nullsLast().op("text_ops")),
	index("rate_limit_violation_path_idx").using("btree", table.path.asc().nullsLast().op("text_ops")),
	index("rate_limit_violation_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("rate_limit_violation_token_idx").using("btree", table.token_id.asc().nullsLast().op("uuid_ops")),
	index("rate_limit_violation_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	index("rate_limit_violation_violated_at_idx").using("btree", table.violated_at.asc().nullsLast().op("timestamptz_ops")),
]);

export const apiKey = pgTable("apiKey", {
	id: text().primaryKey().notNull(),
	name: text(),
	start: text(),
	prefix: text(),
	key: text().notNull(),
	userId: text().notNull(),
	refillInterval: integer(),
	refillAmount: integer(),
	lastRefillAt: timestamp({ withTimezone: true, mode: 'string' }),
	enabled: boolean().default(true).notNull(),
	rateLimitEnabled: boolean().default(true).notNull(),
	rateLimitTimeWindow: integer(),
	rateLimitMax: integer(),
	requestCount: integer().default(0).notNull(),
	remaining: integer(),
	lastRequest: timestamp({ withTimezone: true, mode: 'string' }),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	permissions: text(),
	metadata: text(),
});

export const audit_log = pgTable("audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	event_type: text().notNull(),
	action: text().notNull(),
	actor_type: text().notNull(),
	actor_id: text(),
	actor_email: text(),
	actor_ip: text(),
	actor_user_agent: text(),
	resource_type: text().notNull(),
	resource_id: text(),
	resource_name: text(),
	tenant_id: text(),
	session_id: text(),
	request_id: text(),
	trace_id: text(),
	description: text().notNull(),
	changes: json(),
	http_method: text(),
	http_path: text(),
	http_status_code: integer(),
	response_time: integer(),
	risk_level: text().default('low').notNull(),
	compliance_relevant: boolean().default(false),
	metadata: json(),
	success: boolean().default(true).notNull(),
	error_message: text(),
	error_code: text(),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("audit_log_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("audit_log_actor_idx").using("btree", table.actor_type.asc().nullsLast().op("text_ops"), table.actor_id.asc().nullsLast().op("text_ops")),
	index("audit_log_compliance_idx").using("btree", table.compliance_relevant.asc().nullsLast().op("bool_ops")),
	index("audit_log_event_type_idx").using("btree", table.event_type.asc().nullsLast().op("text_ops")),
	index("audit_log_occurred_at_idx").using("btree", table.occurred_at.asc().nullsLast().op("timestamptz_ops")),
	index("audit_log_resource_idx").using("btree", table.resource_type.asc().nullsLast().op("text_ops"), table.resource_id.asc().nullsLast().op("text_ops")),
	index("audit_log_risk_level_idx").using("btree", table.risk_level.asc().nullsLast().op("text_ops")),
	index("audit_log_success_idx").using("btree", table.success.asc().nullsLast().op("bool_ops")),
	index("audit_log_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
]);

export const error_log = pgTable("error_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	error_id: text().notNull(),
	fingerprint: text().notNull(),
	type: text().notNull(),
	message: text().notNull(),
	stack_trace: text(),
	user_id: text(),
	tenant_id: text(),
	session_id: text(),
	request_id: text(),
	trace_id: text(),
	http_method: text(),
	http_path: text(),
	http_headers: json(),
	http_query: json(),
	http_body: json(),
	service: text().notNull(),
	version: text(),
	environment: text().notNull(),
	user_agent: text(),
	ip_address: text(),
	device_info: json(),
	level: text().default('error').notNull(),
	status: text().default('new').notNull(),
	resolved_at: timestamp({ withTimezone: true, mode: 'string' }),
	resolved_by: text(),
	resolution: text(),
	first_seen: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	last_seen: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	occurrence_count: integer().default(1).notNull(),
	metadata: json().default({}),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("error_log_error_id_idx").using("btree", table.error_id.asc().nullsLast().op("text_ops")),
	index("error_log_fingerprint_idx").using("btree", table.fingerprint.asc().nullsLast().op("text_ops")),
	index("error_log_first_seen_idx").using("btree", table.first_seen.asc().nullsLast().op("timestamptz_ops")),
	index("error_log_last_seen_idx").using("btree", table.last_seen.asc().nullsLast().op("timestamptz_ops")),
	index("error_log_level_idx").using("btree", table.level.asc().nullsLast().op("text_ops")),
	index("error_log_service_idx").using("btree", table.service.asc().nullsLast().op("text_ops")),
	index("error_log_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("error_log_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("error_log_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("error_log_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
]);

export const security_event = pgTable("security_event", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	severity: text().notNull(),
	source_ip: text().notNull(),
	user_agent: text(),
	user_id: text(),
	tenant_id: text(),
	country: text(),
	region: text(),
	city: text(),
	description: text().notNull(),
	details: json().default({}),
	action_taken: text().default('logged').notNull(),
	investigation_status: text().default('pending').notNull(),
	investigated_by: text(),
	investigation_notes: text(),
	detected_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	investigated_at: timestamp({ withTimezone: true, mode: 'string' }),
	resolved_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("security_event_action_idx").using("btree", table.action_taken.asc().nullsLast().op("text_ops")),
	index("security_event_detected_at_idx").using("btree", table.detected_at.asc().nullsLast().op("timestamptz_ops")),
	index("security_event_severity_idx").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	index("security_event_source_ip_idx").using("btree", table.source_ip.asc().nullsLast().op("text_ops")),
	index("security_event_status_idx").using("btree", table.investigation_status.asc().nullsLast().op("text_ops")),
	index("security_event_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("security_event_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("security_event_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
]);

export const system_event = pgTable("system_event", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	category: text().notNull(),
	title: text().notNull(),
	description: text(),
	severity: text().default('info').notNull(),
	source: text().notNull(),
	tenant_id: text(),
	resource_type: text(),
	resource_id: text(),
	data: json().default({}),
	status: text().default('active').notNull(),
	acknowledged_at: timestamp({ withTimezone: true, mode: 'string' }),
	acknowledged_by: text(),
	resolved_at: timestamp({ withTimezone: true, mode: 'string' }),
	resolved_by: text(),
	notification_sent: boolean().default(false),
	notification_channels: json().default([]),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("system_event_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("system_event_occurred_at_idx").using("btree", table.occurred_at.asc().nullsLast().op("timestamptz_ops")),
	index("system_event_severity_idx").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	index("system_event_source_idx").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("system_event_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("system_event_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("system_event_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const maintenance_window = pgTable("maintenance_window", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	type: text().notNull(),
	impact: text().notNull(),
	affected_services: json().default([]),
	affected_tenants: json().default([]),
	scheduled_start: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	scheduled_end: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	actual_start: timestamp({ withTimezone: true, mode: 'string' }),
	actual_end: timestamp({ withTimezone: true, mode: 'string' }),
	status: text().default('scheduled').notNull(),
	notify_users: boolean().default(true),
	notification_sent: boolean().default(false),
	notification_channels: json().default([]),
	workarounds: text(),
	rollback_plan: text(),
	created_by: text().notNull(),
	approved_by: text(),
	approved_at: timestamp({ withTimezone: true, mode: 'string' }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("maintenance_window_scheduled_end_idx").using("btree", table.scheduled_end.asc().nullsLast().op("timestamptz_ops")),
	index("maintenance_window_scheduled_start_idx").using("btree", table.scheduled_start.asc().nullsLast().op("timestamptz_ops")),
	index("maintenance_window_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("maintenance_window_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const system_config = pgTable("system_config", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	category: text().notNull(),
	value: json().notNull(),
	value_type: text().notNull(),
	description: text(),
	is_public: boolean().default(false),
	is_secret: boolean().default(false),
	validation_schema: json(),
	is_active: boolean().default(true).notNull(),
	environment: text().default('all').notNull(),
	last_modified_by: text(),
	change_reason: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("system_config_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("system_config_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("system_config_environment_idx").using("btree", table.environment.asc().nullsLast().op("text_ops")),
	index("system_config_public_idx").using("btree", table.is_public.asc().nullsLast().op("bool_ops")),
	unique("system_config_key_unique").on(table.key),
]);

export const data_retention_policies = pgTable("data_retention_policies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	table_name: varchar({ length: 100 }).notNull(),
	date_column: varchar({ length: 100 }).notNull(),
	retention_days: integer().notNull(),
	batch_size: integer().default(1000),
	conditions: json().default({}),
	is_active: boolean().default(true),
	last_run: timestamp({ mode: 'string' }),
	next_run: timestamp({ mode: 'string' }),
	total_deleted: integer().default(0),
	last_deleted_count: integer().default(0),
	avg_execution_time_ms: real(),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("data_retention_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("data_retention_last_run_idx").using("btree", table.last_run.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("data_retention_name_unique").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("data_retention_next_run_idx").using("btree", table.next_run.asc().nullsLast().op("timestamp_ops")),
	index("data_retention_table_idx").using("btree", table.table_name.asc().nullsLast().op("text_ops")),
]);

export const fastmcp_audit_log = pgTable("fastmcp_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	user_id: varchar({ length: 255 }).notNull(),
	tenant_id: varchar({ length: 255 }),
	user_roles: json().default([]),
	method: varchar({ length: 100 }).notNull(),
	params: json().default({}),
	request_id: varchar({ length: 255 }),
	jsonrpc_version: varchar({ length: 10 }).default('2.0'),
	success: boolean().notNull(),
	duration_ms: integer().notNull(),
	error_code: integer(),
	error_message: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("fastmcp_audit_method_idx").using("btree", table.method.asc().nullsLast().op("text_ops")),
	index("fastmcp_audit_method_success_idx").using("btree", table.method.asc().nullsLast().op("text_ops"), table.success.asc().nullsLast().op("timestamp_ops"), table.timestamp.asc().nullsLast().op("text_ops")),
	index("fastmcp_audit_success_idx").using("btree", table.success.asc().nullsLast().op("bool_ops")),
	index("fastmcp_audit_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("fastmcp_audit_tenant_performance_idx").using("btree", table.tenant_id.asc().nullsLast().op("int4_ops"), table.duration_ms.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("text_ops")),
	index("fastmcp_audit_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	index("fastmcp_audit_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	index("fastmcp_audit_user_time_idx").using("btree", table.user_id.asc().nullsLast().op("timestamp_ops"), table.timestamp.asc().nullsLast().op("text_ops")),
]);

export const materialized_views = pgTable("materialized_views", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	query: text().notNull(),
	indexes: json().default([]),
	refresh_strategy: varchar({ length: 50 }).default('manual'),
	refresh_interval_minutes: integer(),
	refresh_triggers: json().default([]),
	is_active: boolean().default(true),
	last_refreshed: timestamp({ mode: 'string' }),
	next_refresh: timestamp({ mode: 'string' }),
	refresh_count: integer().default(0),
	avg_refresh_time_ms: real(),
	row_count: integer(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	size_bytes: bigint({ mode: "number" }),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("materialized_views_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("materialized_views_last_refresh_idx").using("btree", table.last_refreshed.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("materialized_views_name_unique").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("materialized_views_next_refresh_idx").using("btree", table.next_refresh.asc().nullsLast().op("timestamp_ops")),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	email_verified: boolean().notNull(),
	image: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	role: text().default('user').notNull(),
	tenant_id: text(),
	is_active: boolean().default(true).notNull(),
	last_login_at: timestamp({ withTimezone: true, mode: 'string' }),
	banned: boolean().default(false),
	ban_reason: text(),
	ban_expires: timestamp({ withTimezone: true, mode: 'string' }),
	preferences: json().default({}),
	two_factor_enabled: boolean().default(false),
	backup_codes: json(),
	terms_accepted_at: timestamp({ withTimezone: true, mode: 'string' }),
	privacy_accepted_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("user_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("user_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("user_last_login_idx").using("btree", table.last_login_at.asc().nullsLast().op("timestamptz_ops")),
	index("user_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("user_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	unique("user_email_unique").on(table.email),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	account_id: text().notNull(),
	provider_id: text().notNull(),
	user_id: text().notNull(),
	access_token: text(),
	refresh_token: text(),
	id_token: text(),
	access_token_expires_at: timestamp({ withTimezone: true, mode: 'string' }),
	refresh_token_expires_at: timestamp({ withTimezone: true, mode: 'string' }),
	scope: text(),
	password: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	token_type: text(),
	provider_account_id: text(),
	refresh_token_rotation_enabled: boolean().default(true),
}, (table) => [
	index("account_provider_idx").using("btree", table.provider_id.asc().nullsLast().op("text_ops"), table.account_id.asc().nullsLast().op("text_ops")),
	index("account_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("account_provider_account_unique").on(table.account_id, table.provider_id),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	token: text().notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	ip_address: text(),
	user_agent: text(),
	user_id: text().notNull(),
	impersonated_by: text(),
	device_info: json(),
	last_activity_at: timestamp({ withTimezone: true, mode: 'string' }),
	is_revoked: boolean().default(false),
	revoked_at: timestamp({ withTimezone: true, mode: 'string' }),
	revoked_reason: text(),
}, (table) => [
	index("session_active_idx").using("btree", table.is_revoked.asc().nullsLast().op("bool_ops")),
	index("session_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamptz_ops")),
	index("session_last_activity_idx").using("btree", table.last_activity_at.asc().nullsLast().op("timestamptz_ops")),
	index("session_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("session_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const two_factor_auth = pgTable("two_factor_auth", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	user_id: text().notNull(),
	secret: text().notNull(),
	enabled: boolean().default(false).notNull(),
	backup_codes: json(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	enabled_at: timestamp({ withTimezone: true, mode: 'string' }),
	last_used_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("two_factor_enabled_idx").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "two_factor_auth_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("two_factor_user_unique").on(table.user_id),
]);

export const user_permission = pgTable("user_permission", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	user_id: text().notNull(),
	permission: text().notNull(),
	resource: text(),
	granted_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	granted_by: text(),
	expires_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("user_permission_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamptz_ops")),
	index("user_permission_permission_idx").using("btree", table.permission.asc().nullsLast().op("text_ops")),
	index("user_permission_resource_idx").using("btree", table.resource.asc().nullsLast().op("text_ops")),
	index("user_permission_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "user_permission_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.granted_by],
			foreignColumns: [user.id],
			name: "user_permission_granted_by_user_id_fk"
		}),
	unique("user_permission_unique").on(table.user_id, table.permission, table.resource),
]);

export const tenant = pgTable("tenant", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	domain: text(),
	status: text().default('pending').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	owner_id: text().notNull(),
	billing_email: text(),
	max_users: integer().default(10),
	max_servers: integer().default(5),
	max_api_calls: integer().default(10000),
	features: json().default({}),
	settings: json().default({}),
	current_users: integer().default(0),
	current_servers: integer().default(0),
	current_month_api_calls: integer().default(0),
	plan_type: text().default('free').notNull(),
	subscription_status: text().default('active'),
	subscription_id: text(),
	current_period_start: timestamp({ withTimezone: true, mode: 'string' }),
	current_period_end: timestamp({ withTimezone: true, mode: 'string' }),
	data_region: text().default('us-east-1'),
	encryption_key_id: text(),
	audit_log_retention: integer().default(90),
	contact_email: text(),
	contact_phone: text(),
	support_plan: text().default('community'),
}, (table) => [
	index("tenant_domain_idx").using("btree", table.domain.asc().nullsLast().op("text_ops")),
	index("tenant_owner_idx").using("btree", table.owner_id.asc().nullsLast().op("text_ops")),
	index("tenant_plan_idx").using("btree", table.plan_type.asc().nullsLast().op("text_ops")),
	index("tenant_region_idx").using("btree", table.data_region.asc().nullsLast().op("text_ops")),
	index("tenant_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("tenant_slug_unique").on(table.slug),
]);

export const tenant_invitation = pgTable("tenant_invitation", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenant_id: text().notNull(),
	email: text().notNull(),
	role: text().default('member').notNull(),
	token: text().notNull(),
	status: text().default('pending').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	accepted_at: timestamp({ withTimezone: true, mode: 'string' }),
	revoked_at: timestamp({ withTimezone: true, mode: 'string' }),
	invited_by: text().notNull(),
	message: text(),
}, (table) => [
	index("tenant_invitation_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamptz_ops")),
	index("tenant_invitation_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("tenant_invitation_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenant.id],
			name: "tenant_invitation_tenant_id_tenant_id_fk"
		}).onDelete("cascade"),
	unique("tenant_invitation_tenant_email_unique_idx").on(table.tenant_id, table.email),
	unique("tenant_invitation_token_unique").on(table.token),
]);

export const tenant_member = pgTable("tenant_member", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenant_id: text().notNull(),
	user_id: text().notNull(),
	role: text().default('member').notNull(),
	status: text().default('invited').notNull(),
	joined_at: timestamp({ withTimezone: true, mode: 'string' }),
	invited_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	invited_by: text(),
	permissions: json().default({}),
	ip_whitelist: json(),
	last_access_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("tenant_member_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("tenant_member_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("tenant_member_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("tenant_member_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenant.id],
			name: "tenant_member_tenant_id_tenant_id_fk"
		}).onDelete("cascade"),
	unique("tenant_member_tenant_user_unique_idx").on(table.tenant_id, table.user_id),
]);

export const tenant_usage = pgTable("tenant_usage", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenant_id: text().notNull(),
	period_start: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	period_end: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	api_calls: integer().default(0),
	storage_bytes: integer().default(0),
	active_users: integer().default(0),
	active_servers: integer().default(0),
	usage_details: json().default({}),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("tenant_usage_period_idx").using("btree", table.period_start.asc().nullsLast().op("timestamptz_ops"), table.period_end.asc().nullsLast().op("timestamptz_ops")),
	index("tenant_usage_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenant.id],
			name: "tenant_usage_tenant_id_tenant_id_fk"
		}).onDelete("cascade"),
	unique("tenant_usage_tenant_period_unique_idx").on(table.tenant_id, table.period_start, table.period_end),
]);

export const mcp_server = pgTable("mcp_server", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	version: text().notNull(),
	endpoint_url: text().notNull(),
	transport_type: text().notNull(),
	auth_type: text().default('none').notNull(),
	auth_config: json(),
	status: text().default('inactive').notNull(),
	health_status: text().default('unknown').notNull(),
	last_health_check: timestamp({ withTimezone: true, mode: 'string' }),
	health_check_interval: integer().default(300),
	capabilities: json().default({}),
	tags: json().default([]),
	category: text(),
	tenant_id: text(),
	owner_id: text().notNull(),
	is_public: boolean().default(false),
	request_count: integer().default(0),
	error_count: integer().default(0),
	avg_response_time: numeric({ precision: 10, scale:  3 }),
	uptime: numeric({ precision: 5, scale:  2 }).default('100.00'),
	settings: json().default({}),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	last_used_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_mcp_servers_endpoint_transport").using("btree", table.endpoint_url.asc().nullsLast().op("text_ops"), table.transport_type.asc().nullsLast().op("text_ops")),
	index("idx_mcp_servers_health_check_time").using("btree", table.last_health_check.asc().nullsLast().op("timestamptz_ops")),
	index("idx_mcp_servers_performance").using("btree", table.avg_response_time.asc().nullsLast().op("numeric_ops"), table.uptime.asc().nullsLast().op("numeric_ops")),
	index("idx_mcp_servers_tenant_status").using("btree", table.tenant_id.asc().nullsLast().op("text_ops"), table.health_status.asc().nullsLast().op("text_ops")),
	index("idx_servers_discovery_composite").using("btree", table.health_status.asc().nullsLast().op("numeric_ops"), table.transport_type.asc().nullsLast().op("numeric_ops"), table.avg_response_time.asc().nullsLast().op("text_ops")),
	index("mcp_server_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("mcp_server_health_idx").using("btree", table.health_status.asc().nullsLast().op("text_ops")),
	index("mcp_server_last_used_idx").using("btree", table.last_used_at.asc().nullsLast().op("timestamptz_ops")),
	index("mcp_server_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("mcp_server_owner_idx").using("btree", table.owner_id.asc().nullsLast().op("text_ops")),
	index("mcp_server_public_idx").using("btree", table.is_public.asc().nullsLast().op("bool_ops")),
	index("mcp_server_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("mcp_server_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
]);

export const mcp_prompt = pgTable("mcp_prompt", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	name: text().notNull(),
	description: text(),
	template: text().notNull(),
	arguments: json().default([]),
	tags: json().default([]),
	category: text(),
	use_count: integer().default(0),
	is_active: boolean().default(true),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	last_used_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("mcp_prompt_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("mcp_prompt_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("mcp_prompt_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("mcp_prompt_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "mcp_prompt_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	unique("mcp_prompt_server_name_unique").on(table.server_id, table.name),
]);

export const mcp_resource = pgTable("mcp_resource", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	uri: text().notNull(),
	name: text().notNull(),
	description: text(),
	mime_type: text(),
	size: integer(),
	annotations: json(),
	content_type: text().default('text'),
	access_count: integer().default(0),
	is_active: boolean().default(true),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	last_accessed_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_mcp_resources_uri_server").using("btree", table.uri.asc().nullsLast().op("text_ops"), table.server_id.asc().nullsLast().op("text_ops")),
	index("mcp_resource_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("mcp_resource_mime_type_idx").using("btree", table.mime_type.asc().nullsLast().op("text_ops")),
	index("mcp_resource_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("mcp_resource_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("mcp_resource_uri_idx").using("btree", table.uri.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "mcp_resource_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	unique("mcp_resource_server_uri_unique").on(table.server_id, table.uri),
]);

export const mcp_server_dependency = pgTable("mcp_server_dependency", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	depends_on_server_id: text().notNull(),
	dependency_type: text().default('required').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("mcp_server_dependency_depends_on_idx").using("btree", table.depends_on_server_id.asc().nullsLast().op("text_ops")),
	index("mcp_server_dependency_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "mcp_server_dependency_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.depends_on_server_id],
			foreignColumns: [mcp_server.id],
			name: "mcp_server_dependency_depends_on_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	unique("mcp_server_dependency_unique").on(table.server_id, table.depends_on_server_id),
]);

export const mcp_server_health_check = pgTable("mcp_server_health_check", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	status: text().notNull(),
	response_time: integer(),
	error_message: text(),
	metrics: json(),
	checked_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("mcp_server_health_check_checked_at_idx").using("btree", table.checked_at.asc().nullsLast().op("timestamptz_ops")),
	index("mcp_server_health_check_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("mcp_server_health_check_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "mcp_server_health_check_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
]);

export const mcp_tool = pgTable("mcp_tool", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	name: text().notNull(),
	description: text(),
	input_schema: json(),
	tags: json().default([]),
	category: text(),
	call_count: integer().default(0),
	error_count: integer().default(0),
	avg_execution_time: numeric({ precision: 10, scale:  3 }),
	is_active: boolean().default(true),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	last_used_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_mcp_tools_name_server").using("btree", table.name.asc().nullsLast().op("text_ops"), table.server_id.asc().nullsLast().op("text_ops")),
	index("idx_mcp_tools_usage_stats").using("btree", table.call_count.asc().nullsLast().op("int4_ops"), table.error_count.asc().nullsLast().op("int4_ops")),
	index("idx_tools_discovery_performance").using("btree", table.name.asc().nullsLast().op("text_ops"), table.call_count.asc().nullsLast().op("text_ops"), table.avg_execution_time.asc().nullsLast().op("int4_ops"), table.server_id.asc().nullsLast().op("text_ops")),
	index("mcp_tool_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("mcp_tool_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("mcp_tool_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("mcp_tool_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "mcp_tool_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	unique("mcp_tool_server_name_unique").on(table.server_id, table.name),
]);

export const system_announcement = pgTable("system_announcement", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	type: text().notNull(),
	priority: text().default('normal').notNull(),
	target_audience: text().default('all_users').notNull(),
	target_tenants: json().default([]),
	target_users: json().default([]),
	target_roles: json().default([]),
	display_location: json().default([]),
	is_dismissible: boolean().default(true),
	requires_acknowledgment: boolean().default(false),
	background_color: text(),
	text_color: text(),
	icon: text(),
	starts_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	ends_at: timestamp({ withTimezone: true, mode: 'string' }),
	is_active: boolean().default(true).notNull(),
	action_url: text(),
	action_text: text(),
	view_count: integer().default(0),
	acknowledgment_count: integer().default(0),
	created_by: text().notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("system_announcement_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("system_announcement_ends_at_idx").using("btree", table.ends_at.asc().nullsLast().op("timestamptz_ops")),
	index("system_announcement_priority_idx").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("system_announcement_starts_at_idx").using("btree", table.starts_at.asc().nullsLast().op("timestamptz_ops")),
	index("system_announcement_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const announcement_acknowledgment = pgTable("announcement_acknowledgment", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	announcement_id: uuid().notNull(),
	user_id: text().notNull(),
	acknowledged_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	ip_address: text(),
	user_agent: text(),
}, (table) => [
	index("announcement_acknowledgment_announcement_idx").using("btree", table.announcement_id.asc().nullsLast().op("uuid_ops")),
	index("announcement_acknowledgment_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.announcement_id],
			foreignColumns: [system_announcement.id],
			name: "announcement_acknowledgment_announcement_id_system_announcement"
		}).onDelete("cascade"),
	unique("announcement_acknowledgment_unique_idx").on(table.announcement_id, table.user_id),
]);

export const feature_flag = pgTable("feature_flag", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	key: text().notNull(),
	description: text(),
	type: text().default('boolean').notNull(),
	default_value: json().notNull(),
	is_enabled: boolean().default(false).notNull(),
	rollout_percentage: integer().default(0),
	targeting_rules: json().default([]),
	environments: json().default({}),
	status: text().default('development').notNull(),
	tags: json().default([]),
	owner: text(),
	expires_at: timestamp({ withTimezone: true, mode: 'string' }),
	kill_switch_enabled: boolean().default(false),
	last_modified_by: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("feature_flag_enabled_idx").using("btree", table.is_enabled.asc().nullsLast().op("bool_ops")),
	index("feature_flag_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamptz_ops")),
	index("feature_flag_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("feature_flag_name_unique").on(table.name),
	unique("feature_flag_key_unique").on(table.key),
]);

export const feature_flag_evaluation = pgTable("feature_flag_evaluation", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	flag_id: uuid().notNull(),
	flag_key: text().notNull(),
	user_id: text(),
	tenant_id: text(),
	value: json().notNull(),
	reason: text().notNull(),
	user_agent: text(),
	ip_address: text(),
	metadata: json().default({}),
	evaluated_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("feature_flag_evaluation_evaluated_at_idx").using("btree", table.evaluated_at.asc().nullsLast().op("timestamptz_ops")),
	index("feature_flag_evaluation_flag_idx").using("btree", table.flag_id.asc().nullsLast().op("uuid_ops")),
	index("feature_flag_evaluation_flag_key_idx").using("btree", table.flag_key.asc().nullsLast().op("text_ops")),
	index("feature_flag_evaluation_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("feature_flag_evaluation_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.flag_id],
			foreignColumns: [feature_flag.id],
			name: "feature_flag_evaluation_flag_id_feature_flag_id_fk"
		}).onDelete("cascade"),
]);

export const circuit_breakers = pgTable("circuit_breakers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	service_name: varchar({ length: 255 }).notNull(),
	state: circuit_breaker_state().default('closed'),
	failure_count: integer().default(0),
	success_count: integer().default(0),
	failure_threshold: integer().default(5),
	success_threshold: integer().default(2),
	timeout_ms: integer().default(60000),
	last_failure_time: timestamp({ mode: 'string' }),
	last_success_time: timestamp({ mode: 'string' }),
	last_state_change: timestamp({ mode: 'string' }).defaultNow().notNull(),
	total_requests: integer().default(0),
	total_failures: integer().default(0),
	total_timeouts: integer().default(0),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("circuit_breakers_last_change_idx").using("btree", table.last_state_change.asc().nullsLast().op("timestamp_ops")),
	index("circuit_breakers_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("circuit_breakers_service_idx").using("btree", table.service_name.asc().nullsLast().op("text_ops")),
	index("circuit_breakers_state_idx").using("btree", table.state.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "circuit_breakers_server_id_mcp_server_id_fk"
		}),
]);

export const connection_pools = pgTable("connection_pools", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	pool_name: varchar({ length: 255 }).notNull(),
	transport_type: transport_type().notNull(),
	max_size: integer().default(10),
	min_size: integer().default(2),
	timeout_ms: integer().default(30000),
	idle_timeout_ms: integer().default(300000),
	active_connections: integer().default(0),
	idle_connections: integer().default(0),
	pending_requests: integer().default(0),
	is_healthy: boolean().default(true),
	last_health_check: timestamp({ mode: 'string' }),
	total_connections_created: integer().default(0),
	total_connections_closed: integer().default(0),
	connection_errors: integer().default(0),
	avg_connection_time_ms: real(),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("connection_pools_healthy_idx").using("btree", table.is_healthy.asc().nullsLast().op("bool_ops")),
	index("connection_pools_name_idx").using("btree", table.pool_name.asc().nullsLast().op("text_ops")),
	index("connection_pools_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "connection_pools_server_id_mcp_server_id_fk"
		}),
]);

export const enhanced_api_keys = pgTable("enhanced_api_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	key_hash: varchar({ length: 255 }).notNull(),
	key_prefix: varchar({ length: 20 }).notNull(),
	salt: varchar({ length: 255 }).notNull(),
	user_id: text(),
	tenant_id: text(),
	scopes: json().default([]),
	allowed_servers: json().default([]),
	allowed_methods: json().default([]),
	ip_whitelist: json().default([]),
	rate_limit_per_hour: integer().default(1000),
	rate_limit_per_day: integer().default(10000),
	is_active: boolean().default(true),
	expires_at: timestamp({ mode: 'string' }),
	last_used: timestamp({ mode: 'string' }),
	total_requests: integer().default(0),
	total_errors: integer().default(0),
	last_success: timestamp({ mode: 'string' }),
	last_error: timestamp({ mode: 'string' }),
	failed_attempts: integer().default(0),
	last_failed_attempt: timestamp({ mode: 'string' }),
	is_locked: boolean().default(false),
	locked_until: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("enhanced_api_keys_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("enhanced_api_keys_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("enhanced_api_keys_hash_unique").using("btree", table.key_hash.asc().nullsLast().op("text_ops")),
	index("enhanced_api_keys_last_used_idx").using("btree", table.last_used.asc().nullsLast().op("timestamp_ops")),
	index("enhanced_api_keys_locked_idx").using("btree", table.is_locked.asc().nullsLast().op("bool_ops")),
	index("enhanced_api_keys_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("enhanced_api_keys_prefix_idx").using("btree", table.key_prefix.asc().nullsLast().op("text_ops")),
	index("enhanced_api_keys_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("enhanced_api_keys_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "enhanced_api_keys_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenant.id],
			name: "enhanced_api_keys_tenant_id_tenant_id_fk"
		}),
]);

export const performance_alerts = pgTable("performance_alerts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	server_id: text(),
	metric_name: varchar({ length: 100 }).notNull(),
	threshold_value: real().notNull(),
	comparison_operator: varchar({ length: 10 }).notNull(),
	duration_minutes: integer().default(5),
	is_active: boolean().default(true),
	is_triggered: boolean().default(false),
	first_triggered: timestamp({ mode: 'string' }),
	last_triggered: timestamp({ mode: 'string' }),
	trigger_count: integer().default(0),
	notification_channels: json().default([]),
	cooldown_minutes: integer().default(60),
	last_notification: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("performance_alerts_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("performance_alerts_metric_idx").using("btree", table.metric_name.asc().nullsLast().op("text_ops")),
	index("performance_alerts_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("performance_alerts_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("performance_alerts_triggered_idx").using("btree", table.is_triggered.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "performance_alerts_server_id_mcp_server_id_fk"
		}),
]);

export const request_logs = pgTable("request_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	request_id: varchar({ length: 255 }).notNull(),
	user_id: text(),
	tenant_id: text(),
	ip_address: varchar({ length: 45 }),
	method: varchar({ length: 10 }).notNull(),
	path: varchar({ length: 500 }).notNull(),
	query_params: json().default({}),
	headers: json().default({}),
	target_server_id: text(),
	request_time: timestamp({ mode: 'string' }).defaultNow().notNull(),
	response_time: timestamp({ mode: 'string' }),
	duration_ms: real(),
	status_code: integer(),
	response_size_bytes: integer(),
	error_type: varchar({ length: 100 }),
	error_message: text(),
	request_metadata: json().default({}),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("request_logs_ip_idx").using("btree", table.ip_address.asc().nullsLast().op("text_ops")),
	index("request_logs_path_idx").using("btree", table.path.asc().nullsLast().op("text_ops")),
	uniqueIndex("request_logs_request_id_unique").using("btree", table.request_id.asc().nullsLast().op("text_ops")),
	index("request_logs_server_idx").using("btree", table.target_server_id.asc().nullsLast().op("text_ops")),
	index("request_logs_server_performance_idx").using("btree", table.target_server_id.asc().nullsLast().op("text_ops"), table.duration_ms.asc().nullsLast().op("int4_ops"), table.status_code.asc().nullsLast().op("float4_ops")),
	index("request_logs_status_idx").using("btree", table.status_code.asc().nullsLast().op("int4_ops")),
	index("request_logs_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("request_logs_tenant_time_idx").using("btree", table.tenant_id.asc().nullsLast().op("timestamp_ops"), table.request_time.asc().nullsLast().op("timestamp_ops")),
	index("request_logs_time_idx").using("btree", table.request_time.asc().nullsLast().op("timestamp_ops")),
	index("request_logs_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "request_logs_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenant.id],
			name: "request_logs_tenant_id_tenant_id_fk"
		}),
	foreignKey({
			columns: [table.target_server_id],
			foreignColumns: [mcp_server.id],
			name: "request_logs_target_server_id_mcp_server_id_fk"
		}),
]);

export const request_queues = pgTable("request_queues", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	queue_name: varchar({ length: 255 }).notNull(),
	max_size: integer().default(1000),
	processing_timeout_ms: integer().default(60000),
	priority_levels: integer().default(3),
	current_size: integer().default(0),
	processing_count: integer().default(0),
	is_accepting_requests: boolean().default(true),
	last_processed: timestamp({ mode: 'string' }),
	total_enqueued: integer().default(0),
	total_processed: integer().default(0),
	total_timeouts: integer().default(0),
	total_errors: integer().default(0),
	avg_processing_time_ms: real(),
	avg_wait_time_ms: real(),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("request_queues_accepting_idx").using("btree", table.is_accepting_requests.asc().nullsLast().op("bool_ops")),
	index("request_queues_name_idx").using("btree", table.queue_name.asc().nullsLast().op("text_ops")),
	index("request_queues_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("request_queues_size_idx").using("btree", table.current_size.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "request_queues_server_id_mcp_server_id_fk"
		}),
]);

export const server_access_control = pgTable("server_access_control", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	user_id: text(),
	tenant_id: text(),
	api_key_id: uuid(),
	can_read: boolean().default(true),
	can_write: boolean().default(false),
	can_admin: boolean().default(false),
	can_proxy: boolean().default(true),
	allowed_methods: json().default([]),
	denied_methods: json().default([]),
	access_start_time: timestamp({ mode: 'string' }),
	access_end_time: timestamp({ mode: 'string' }),
	allowed_days: json().default([]),
	allowed_hours: json().default([]),
	is_active: boolean().default(true),
	last_access: timestamp({ mode: 'string' }),
	access_count: integer().default(0),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("server_access_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("server_access_api_key_idx").using("btree", table.api_key_id.asc().nullsLast().op("uuid_ops")),
	index("server_access_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("server_access_tenant_idx").using("btree", table.tenant_id.asc().nullsLast().op("text_ops")),
	index("server_access_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "server_access_control_server_id_mcp_server_id_fk"
		}),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "server_access_control_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenant.id],
			name: "server_access_control_tenant_id_tenant_id_fk"
		}),
	foreignKey({
			columns: [table.api_key_id],
			foreignColumns: [enhanced_api_keys.id],
			name: "server_access_control_api_key_id_enhanced_api_keys_id_fk"
		}),
]);

export const server_metrics = pgTable("server_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	server_id: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	response_time_ms: real(),
	requests_per_second: real(),
	error_rate: real(),
	cpu_usage: real(),
	memory_usage_mb: real(),
	active_connections: integer(),
	connection_pool_size: integer(),
	custom_metrics: json().default({}),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("server_metrics_performance_idx").using("btree", table.response_time_ms.asc().nullsLast().op("float4_ops"), table.error_rate.asc().nullsLast().op("float4_ops")),
	index("server_metrics_server_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("server_metrics_server_time_idx").using("btree", table.server_id.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("text_ops")),
	index("server_metrics_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_server.id],
			name: "server_metrics_server_id_mcp_server_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	user_id: text().notNull(),
	session_token: varchar({ length: 255 }).notNull(),
	ip_address: varchar({ length: 45 }),
	user_agent: varchar({ length: 500 }),
	expires_at: timestamp({ mode: 'string' }).notNull(),
	session_data: json().default({}),
	is_active: boolean().default(true),
	last_activity: timestamp({ mode: 'string' }).defaultNow().notNull(),
	created_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sessions_active_idx").using("btree", table.is_active.asc().nullsLast().op("bool_ops")),
	index("sessions_expires_idx").using("btree", table.expires_at.asc().nullsLast().op("timestamp_ops")),
	index("sessions_last_activity_idx").using("btree", table.last_activity.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("sessions_token_unique").using("btree", table.session_token.asc().nullsLast().op("text_ops")),
	index("sessions_user_idx").using("btree", table.user_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [user.id],
			name: "sessions_user_id_user_id_fk"
		}),
]);

export const tenants = pgTable("tenants", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: varchar(),
	status: tenantstatus().notNull(),
	settings: json().notNull(),
}, (table) => [
	index("ix_tenants_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	username: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	full_name: varchar({ length: 255 }),
	role: userrole().notNull(),
	is_active: boolean().notNull(),
	auth_provider: varchar({ length: 50 }),
	auth_provider_id: varchar({ length: 255 }),
	tenant_id: varchar(),
	user_metadata: json().notNull(),
}, (table) => [
	uniqueIndex("ix_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("ix_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenants.id],
			name: "users_tenant_id_fkey"
		}),
]);

export const mcp_servers = pgTable("mcp_servers", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: varchar(),
	version: varchar({ length: 50 }).notNull(),
	endpoint_url: varchar({ length: 500 }).notNull(),
	transport_type: transporttype().notNull(),
	capabilities: json().notNull(),
	tags: json().notNull(),
	health_status: serverstatus().notNull(),
	last_health_check: timestamp({ mode: 'string' }),
	health_metadata: json().notNull(),
	avg_response_time: doublePrecision(),
	success_rate: doublePrecision(),
	active_connections: integer(),
	tenant_id: varchar(),
}, (table) => [
	index("ix_mcp_servers_endpoint_url").using("btree", table.endpoint_url.asc().nullsLast().op("text_ops")),
	index("ix_mcp_servers_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenants.id],
			name: "mcp_servers_tenant_id_fkey"
		}),
]);

export const routing_rules = pgTable("routing_rules", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: varchar(),
	conditions: json().notNull(),
	target_servers: json().notNull(),
	load_balancing_strategy: varchar({ length: 50 }).notNull(),
	priority: integer().notNull(),
	is_active: boolean().notNull(),
	tenant_id: varchar(),
}, (table) => [
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenants.id],
			name: "routing_rules_tenant_id_fkey"
		}),
]);

export const system_configs = pgTable("system_configs", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	key: varchar({ length: 255 }).notNull(),
	value: json().notNull(),
	description: varchar(),
	category: varchar({ length: 100 }).notNull(),
	is_sensitive: boolean().notNull(),
	is_runtime_configurable: boolean().notNull(),
	version: integer().notNull(),
	tenant_id: varchar(),
}, (table) => [
	index("ix_system_configs_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	uniqueIndex("ix_system_configs_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenants.id],
			name: "system_configs_tenant_id_fkey"
		}),
]);

export const audit_logs = pgTable("audit_logs", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	user_id: varchar(),
	tenant_id: varchar(),
	service_name: varchar({ length: 100 }),
	action: varchar({ length: 100 }).notNull(),
	resource_type: varchar({ length: 100 }).notNull(),
	resource_id: varchar({ length: 255 }),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	details: json().notNull(),
	request_id: varchar({ length: 255 }),
	ip_address: varchar({ length: 45 }),
	user_agent: varchar({ length: 500 }),
	success: boolean().notNull(),
	error_message: varchar(),
}, (table) => [
	index("ix_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("ix_audit_logs_request_id").using("btree", table.request_id.asc().nullsLast().op("text_ops")),
	index("ix_audit_logs_resource_id").using("btree", table.resource_id.asc().nullsLast().op("text_ops")),
	index("ix_audit_logs_resource_type").using("btree", table.resource_type.asc().nullsLast().op("text_ops")),
	index("ix_audit_logs_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_fkey"
		}),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenants.id],
			name: "audit_logs_tenant_id_fkey"
		}),
]);

export const api_keys = pgTable("api_keys", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	key_hash: varchar({ length: 255 }).notNull(),
	key_prefix: varchar({ length: 20 }).notNull(),
	user_id: varchar(),
	tenant_id: varchar(),
	permissions: json().notNull(),
	scopes: json().notNull(),
	is_active: boolean().notNull(),
	expires_at: timestamp({ mode: 'string' }),
	last_used: timestamp({ mode: 'string' }),
	total_requests: integer().notNull(),
	api_key_metadata: json().notNull(),
}, (table) => [
	uniqueIndex("ix_api_keys_key_hash").using("btree", table.key_hash.asc().nullsLast().op("text_ops")),
	index("ix_api_keys_key_prefix").using("btree", table.key_prefix.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "api_keys_user_id_fkey"
		}),
	foreignKey({
			columns: [table.tenant_id],
			foreignColumns: [tenants.id],
			name: "api_keys_tenant_id_fkey"
		}),
]);

export const server_tools = pgTable("server_tools", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	server_id: varchar().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: varchar(),
	tool_schema: json().notNull(),
	tags: json().notNull(),
	total_calls: integer().notNull(),
	success_count: integer().notNull(),
	error_count: integer().notNull(),
	avg_execution_time: doublePrecision(),
}, (table) => [
	index("ix_server_tools_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("ix_server_tools_server_id").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_servers.id],
			name: "server_tools_server_id_fkey"
		}),
]);

export const server_resources = pgTable("server_resources", {
	created_at: timestamp({ mode: 'string' }).notNull(),
	updated_at: timestamp({ mode: 'string' }).notNull(),
	id: varchar().primaryKey().notNull(),
	server_id: varchar().notNull(),
	uri_template: varchar({ length: 500 }).notNull(),
	name: varchar({ length: 255 }),
	description: varchar(),
	mime_type: varchar({ length: 100 }),
	total_accesses: integer().notNull(),
	avg_size_bytes: integer(),
}, (table) => [
	index("ix_server_resources_server_id").using("btree", table.server_id.asc().nullsLast().op("text_ops")),
	index("ix_server_resources_uri_template").using("btree", table.uri_template.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.server_id],
			foreignColumns: [mcp_servers.id],
			name: "server_resources_server_id_fkey"
		}),
]);
export const v_tenant_activity = pgView("v_tenant_activity", {	tenant_id: text(),
	tenant_name: text(),
	tenant_status: text(),
	plan_type: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	active_sessions: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	server_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	active_servers: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	api_token_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	total_api_calls_today: bigint({ mode: "number" }),
	avg_response_time: numeric(),
	last_user_activity: timestamp({ withTimezone: true, mode: 'string' }),
	tenant_created: timestamp({ withTimezone: true, mode: 'string' }),
	tenant_updated: timestamp({ withTimezone: true, mode: 'string' }),
}).as(sql`SELECT t.id AS tenant_id, t.name AS tenant_name, t.status AS tenant_status, t.plan_type, count(DISTINCT u.id) AS user_count, count(DISTINCT s.id) AS active_sessions, count(DISTINCT ms.id) AS server_count, count(DISTINCT ms.id) FILTER (WHERE ms.status = 'active'::text) AS active_servers, count(DISTINCT at.id) AS api_token_count, COALESCE(sum(aus.total_requests), 0::bigint) AS total_api_calls_today, COALESCE(avg(ms.avg_response_time), 0::numeric) AS avg_response_time, max(u.last_login_at) AS last_user_activity, t.created_at AS tenant_created, t.updated_at AS tenant_updated FROM tenant t LEFT JOIN "user" u ON t.id = u.tenant_id LEFT JOIN session s ON u.id = s.user_id AND s.expires_at > now() AND s.is_revoked = false LEFT JOIN mcp_server ms ON t.id = ms.tenant_id LEFT JOIN api_token at ON t.id = at.tenant_id AND at.is_active = true LEFT JOIN api_usage_stats aus ON t.id = aus.tenant_id AND aus.period_type = 'day'::text AND aus.period_start = CURRENT_DATE GROUP BY t.id, t.name, t.status, t.plan_type, t.created_at, t.updated_at ORDER BY (COALESCE(sum(aus.total_requests), 0::bigint)) DESC`);

export const v_security_audit = pgView("v_security_audit", {	audit_id: uuid(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }),
	event_type: text(),
	action: text(),
	user_id: text(),
	user_email: text(),
	user_role: text(),
	resource_type: text(),
	resource_id: text(),
	success: boolean(),
	error_message: text(),
	ip_address: text(),
	user_agent: text(),
	risk_level: text(),
	tenant_name: text(),
	metadata: json(),
}).as(sql`SELECT al.id AS audit_id, al.occurred_at AS "timestamp", al.event_type, al.action, al.actor_id AS user_id, u.email AS user_email, u.role AS user_role, al.resource_type, al.resource_id, al.success, al.error_message, al.actor_ip AS ip_address, al.actor_user_agent AS user_agent, al.risk_level, t.name AS tenant_name, al.metadata FROM audit_log al LEFT JOIN "user" u ON al.actor_id = u.id LEFT JOIN tenant t ON al.tenant_id = t.id WHERE al.occurred_at > (now() - '7 days'::interval) ORDER BY al.occurred_at DESC`);

export const v_rate_limit_status = pgView("v_rate_limit_status", {	config_id: uuid(),
	limit_name: text(),
	scope: text(),
	rules: text(),
	priority: integer(),
	is_active: boolean(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	violation_count_24h: bigint({ mode: "number" }),
	last_violation: timestamp({ withTimezone: true, mode: 'string' }),
	violation_severity: text(),
}).as(sql`SELECT rlc.id AS config_id, rlc.name AS limit_name, rlc.scope, rlc.rules::text AS rules, rlc.priority, rlc.is_active, count(rlv.id) AS violation_count_24h, max(rlv.violated_at) AS last_violation, CASE WHEN count(rlv.id) > 10 THEN 'HIGH'::text WHEN count(rlv.id) > 5 THEN 'MEDIUM'::text WHEN count(rlv.id) > 0 THEN 'LOW'::text ELSE 'NONE'::text END AS violation_severity FROM rate_limit_config rlc LEFT JOIN rate_limit_violation rlv ON rlv.rule_id = rlc.id AND rlv.violated_at > (now() - '24:00:00'::interval) WHERE rlc.is_active = true GROUP BY rlc.id, rlc.name, rlc.scope, (rlc.rules::text), rlc.priority, rlc.is_active ORDER BY (count(rlv.id)) DESC`);

export const v_system_health_dashboard = pgView("v_system_health_dashboard", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	total_servers: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	healthy_servers: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unhealthy_servers: bigint({ mode: "number" }),
	avg_server_response_ms: numeric(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	requests_24h: bigint({ mode: "number" }),
	avg_api_response_ms: numeric(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	errors_24h: bigint({ mode: "number" }),
	error_rate_percent: numeric(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	active_sessions: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unique_users: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	total_tenants: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	active_tenants: bigint({ mode: "number" }),
	dashboard_generated_at: timestamp({ withTimezone: true, mode: 'string' }),
}).as(sql`WITH server_health AS ( SELECT count(*) AS total_servers, count(*) FILTER (WHERE mcp_server.health_status = 'healthy'::text) AS healthy_servers, count(*) FILTER (WHERE mcp_server.health_status = 'unhealthy'::text) AS unhealthy_servers, avg(mcp_server.avg_response_time) AS avg_response_time FROM mcp_server WHERE mcp_server.status = 'active'::text ), api_metrics AS ( SELECT count(*) AS requests_24h, avg(api_usage.response_time) AS avg_api_response, count(*) FILTER (WHERE api_usage.status_code >= 400) AS errors_24h FROM api_usage WHERE api_usage.requested_at > (now() - '24:00:00'::interval) ), session_metrics AS ( SELECT count(*) AS active_sessions, count(DISTINCT session.user_id) AS unique_users FROM session WHERE session.expires_at > now() AND session.is_revoked = false ), tenant_metrics AS ( SELECT count(*) AS total_tenants, count(*) FILTER (WHERE tenant.status = 'active'::text) AS active_tenants FROM tenant ) SELECT sh.total_servers, sh.healthy_servers, sh.unhealthy_servers, round(sh.avg_response_time, 2) AS avg_server_response_ms, am.requests_24h, round(am.avg_api_response, 2) AS avg_api_response_ms, am.errors_24h, round(am.errors_24h::numeric / NULLIF(am.requests_24h, 0)::numeric * 100::numeric, 2) AS error_rate_percent, sm.active_sessions, sm.unique_users, tm.total_tenants, tm.active_tenants, now() AS dashboard_generated_at FROM server_health sh CROSS JOIN api_metrics am CROSS JOIN session_metrics sm CROSS JOIN tenant_metrics tm`);

export const v_server_overview = pgView("v_server_overview", {	id: text(),
	name: text(),
	endpoint_url: text(),
	transport_type: text(),
	status: text(),
	health_status: text(),
	last_health_check: timestamp({ withTimezone: true, mode: 'string' }),
	avg_response_time: numeric({ precision: 10, scale:  3 }),
	success_rate: numeric(),
	uptime: numeric({ precision: 5, scale:  2 }),
	request_count: integer(),
	tenant_name: text(),
	tenant_status: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tool_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	resource_count: bigint({ mode: "number" }),
}).as(sql`SELECT ms.id, ms.name, ms.endpoint_url, ms.transport_type, ms.status, ms.health_status, ms.last_health_check, ms.avg_response_time, CASE WHEN (ms.request_count + ms.error_count) > 0 THEN round(ms.request_count::numeric / (ms.request_count + ms.error_count)::numeric * 100::numeric, 2) ELSE 100.00 END AS success_rate, ms.uptime, ms.request_count, t.name AS tenant_name, t.status AS tenant_status, count(DISTINCT mt.id) AS tool_count, count(DISTINCT mr.id) AS resource_count FROM mcp_server ms LEFT JOIN tenant t ON ms.tenant_id = t.id LEFT JOIN mcp_tool mt ON ms.id = mt.server_id LEFT JOIN mcp_resource mr ON ms.id = mr.server_id GROUP BY ms.id, ms.name, ms.endpoint_url, ms.transport_type, ms.status, ms.health_status, ms.last_health_check, ms.avg_response_time, ms.uptime, ms.request_count, ms.error_count, t.name, t.status`);

export const v_active_sessions = pgView("v_active_sessions", {	session_id: text(),
	user_id: text(),
	user_email: text(),
	user_name: text(),
	user_role: text(),
	tenant_name: text(),
	session_start: timestamp({ withTimezone: true, mode: 'string' }),
	session_expires: timestamp({ withTimezone: true, mode: 'string' }),
	last_activity_at: timestamp({ withTimezone: true, mode: 'string' }),
	ip_address: text(),
	user_agent: text(),
	impersonated_by: text(),
	minutes_until_expiry: numeric(),
}).as(sql`SELECT s.id AS session_id, s.user_id, u.email AS user_email, u.name AS user_name, u.role AS user_role, t.name AS tenant_name, s.created_at AS session_start, s.expires_at AS session_expires, s.last_activity_at, s.ip_address, s.user_agent, s.impersonated_by, EXTRACT(epoch FROM s.expires_at - now()) / 60::numeric AS minutes_until_expiry FROM session s JOIN "user" u ON s.user_id = u.id LEFT JOIN tenant t ON u.tenant_id = t.id WHERE s.expires_at > now() AND s.is_revoked = false ORDER BY s.created_at DESC`);

export const v_api_usage_stats = pgView("v_api_usage_stats", {	hour_bucket: timestamp({ withTimezone: true, mode: 'string' }),
	path: text(),
	method: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	request_count: bigint({ mode: "number" }),
	avg_response_time: numeric(),
	min_response_time: integer(),
	max_response_time: integer(),
	median_response_time: doublePrecision(),
	p95_response_time: doublePrecision(),
	p99_response_time: doublePrecision(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	success_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	client_error_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	server_error_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unique_users: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unique_ips: bigint({ mode: "number" }),
}).as(sql`SELECT date_trunc('hour'::text, requested_at) AS hour_bucket, path, method, count(*) AS request_count, avg(response_time) AS avg_response_time, min(response_time) AS min_response_time, max(response_time) AS max_response_time, percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY (response_time::double precision)) AS median_response_time, percentile_cont(0.95::double precision) WITHIN GROUP (ORDER BY (response_time::double precision)) AS p95_response_time, percentile_cont(0.99::double precision) WITHIN GROUP (ORDER BY (response_time::double precision)) AS p99_response_time, count(*) FILTER (WHERE status_code >= 200 AND status_code < 300) AS success_count, count(*) FILTER (WHERE status_code >= 400 AND status_code < 500) AS client_error_count, count(*) FILTER (WHERE status_code >= 500) AS server_error_count, count(DISTINCT user_id) AS unique_users, count(DISTINCT ip_address) AS unique_ips FROM api_usage au WHERE requested_at > (now() - '24:00:00'::interval) GROUP BY (date_trunc('hour'::text, requested_at)), path, method ORDER BY (date_trunc('hour'::text, requested_at)) DESC, (count(*)) DESC`);

export const v_tool_performance = pgView("v_tool_performance", {	tool_id: uuid(),
	tool_name: text(),
	description: text(),
	server_name: text(),
	server_health: text(),
	total_calls: integer(),
	success_count: integer(),
	error_count: integer(),
	success_rate: numeric(),
	avg_execution_time: numeric({ precision: 10, scale:  3 }),
	last_used: timestamp({ withTimezone: true, mode: 'string' }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }),
	tags: json(),
}).as(sql`SELECT mt.id AS tool_id, mt.name AS tool_name, mt.description, ms.name AS server_name, ms.health_status AS server_health, mt.call_count AS total_calls, CASE WHEN mt.call_count > mt.error_count THEN mt.call_count - mt.error_count ELSE 0 END AS success_count, mt.error_count, CASE WHEN mt.call_count > 0 THEN round((mt.call_count - mt.error_count)::numeric / mt.call_count::numeric * 100::numeric, 2) ELSE 0::numeric END AS success_rate, mt.avg_execution_time, mt.last_used_at AS last_used, mt.created_at, mt.tags FROM mcp_tool mt JOIN mcp_server ms ON mt.server_id = ms.id WHERE mt.call_count > 0 ORDER BY mt.call_count DESC`);

export const mv_daily_usage_summary = pgMaterializedView("mv_daily_usage_summary", {	usage_date: date(),
	tenant_id: text(),
	tenant_name: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	total_requests: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unique_users: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unique_endpoints: bigint({ mode: "number" }),
	avg_response_time: numeric(),
	median_response_time: doublePrecision(),
	p95_response_time: doublePrecision(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	success_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	error_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	total_bytes_served: bigint({ mode: "number" }),
}).as(sql`SELECT date(au.requested_at) AS usage_date, t.id AS tenant_id, t.name AS tenant_name, count(*) AS total_requests, count(DISTINCT au.user_id) AS unique_users, count(DISTINCT au.path) AS unique_endpoints, avg(au.response_time) AS avg_response_time, percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY (au.response_time::double precision)) AS median_response_time, percentile_cont(0.95::double precision) WITHIN GROUP (ORDER BY (au.response_time::double precision)) AS p95_response_time, count(*) FILTER (WHERE au.status_code >= 200 AND au.status_code < 300) AS success_count, count(*) FILTER (WHERE au.status_code >= 400) AS error_count, sum(au.response_size) AS total_bytes_served FROM api_usage au LEFT JOIN "user" u ON au.user_id = u.id LEFT JOIN tenant t ON u.tenant_id = t.id WHERE au.requested_at >= (CURRENT_DATE - '30 days'::interval) GROUP BY (date(au.requested_at)), t.id, t.name ORDER BY (date(au.requested_at)) DESC, (count(*)) DESC`);

export const database_size_summary = pgView("database_size_summary", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	total_size_bytes: bigint({ mode: "number" }),
	total_size_pretty: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	table_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	index_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	view_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	function_count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	active_connections: bigint({ mode: "number" }),
	max_connections: integer(),
	checked_at: timestamp({ withTimezone: true, mode: 'string' }),
}).as(sql`SELECT pg_database_size(current_database()) AS total_size_bytes, pg_size_pretty(pg_database_size(current_database())) AS total_size_pretty, ( SELECT count(*) AS count FROM pg_stat_user_tables) AS table_count, ( SELECT count(*) AS count FROM pg_stat_user_indexes) AS index_count, ( SELECT count(*) AS count FROM pg_views WHERE pg_views.schemaname = 'public'::name) AS view_count, ( SELECT count(*) AS count FROM pg_proc WHERE pg_proc.pronamespace = (( SELECT pg_namespace.oid FROM pg_namespace WHERE pg_namespace.nspname = 'public'::name))) AS function_count, ( SELECT count(*) AS count FROM pg_stat_activity WHERE pg_stat_activity.datname = current_database()) AS active_connections, ( SELECT pg_settings.setting::integer AS setting FROM pg_settings WHERE pg_settings.name = 'max_connections'::text) AS max_connections, now() AS checked_at`);

export const mv_server_performance_metrics = pgMaterializedView("mv_server_performance_metrics", {	server_id: text(),
	server_name: text(),
	endpoint_url: text(),
	health_status: text(),
	hour_bucket: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	metric_count: bigint({ mode: "number" }),
	avg_response_time: doublePrecision(),
	min_response_time: real(),
	max_response_time: real(),
	avg_rps: doublePrecision(),
	avg_error_rate: doublePrecision(),
	avg_cpu_usage: doublePrecision(),
	avg_memory_mb: doublePrecision(),
}).as(sql`SELECT ms.id AS server_id, ms.name AS server_name, ms.endpoint_url, ms.health_status, date_trunc('hour'::text, sm."timestamp") AS hour_bucket, count(*) AS metric_count, avg(sm.response_time_ms) AS avg_response_time, min(sm.response_time_ms) AS min_response_time, max(sm.response_time_ms) AS max_response_time, avg(sm.requests_per_second) AS avg_rps, avg(sm.error_rate) AS avg_error_rate, avg(sm.cpu_usage) AS avg_cpu_usage, avg(sm.memory_usage_mb) AS avg_memory_mb FROM mcp_server ms JOIN server_metrics sm ON ms.id = sm.server_id WHERE sm."timestamp" >= (now() - '7 days'::interval) GROUP BY ms.id, ms.name, ms.endpoint_url, ms.health_status, (date_trunc('hour'::text, sm."timestamp")) ORDER BY (date_trunc('hour'::text, sm."timestamp")) DESC, ms.name`);

export const index_usage_summary = pgView("index_usage_summary", {	// TODO: failed to parse database type 'name'
	schemaname: unknown("schemaname"),
	// TODO: failed to parse database type 'name'
	tablename: unknown("tablename"),
	// TODO: failed to parse database type 'name'
	indexname: unknown("indexname"),
	index_size: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	index_scans: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tuples_read: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tuples_fetched: bigint({ mode: "number" }),
	usage_category: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	size_bytes: bigint({ mode: "number" }),
}).as(sql`SELECT schemaname, relname AS tablename, indexrelname AS indexname, pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size, idx_scan AS index_scans, idx_tup_read AS tuples_read, idx_tup_fetch AS tuples_fetched, CASE WHEN idx_scan = 0 THEN 'Unused'::text WHEN idx_scan < 10 THEN 'Rarely Used'::text WHEN idx_scan < 100 THEN 'Occasionally Used'::text ELSE 'Frequently Used'::text END AS usage_category, pg_relation_size(indexrelid::regclass) AS size_bytes FROM pg_stat_user_indexes ORDER BY idx_scan, (pg_relation_size(indexrelid::regclass)) DESC`);

export const performance_monitoring = pgView("performance_monitoring", {	component: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	metric_value: bigint({ mode: "number" }),
	metric_name: text(),
	metric_display: text(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }),
}).as(sql`SELECT 'database'::text AS component, pg_database_size(current_database()) AS metric_value, 'Database Size (bytes)'::text AS metric_name, pg_size_pretty(pg_database_size(current_database())) AS metric_display, now() AS "timestamp" UNION ALL SELECT 'connections'::text AS component, count(*) AS metric_value, 'Active Connections'::text AS metric_name, count(*)::text || ' connections'::text AS metric_display, now() AS "timestamp" FROM pg_stat_activity WHERE pg_stat_activity.state = 'active'::text UNION ALL SELECT 'tables'::text AS component, count(*) AS metric_value, 'Total Tables'::text AS metric_name, count(*)::text || ' tables'::text AS metric_display, now() AS "timestamp" FROM pg_stat_user_tables UNION ALL SELECT 'indexes'::text AS component, count(*) AS metric_value, 'Total Indexes'::text AS metric_name, count(*)::text || ' indexes'::text AS metric_display, now() AS "timestamp" FROM pg_stat_user_indexes`);

export const performance_alert_status = pgView("performance_alert_status", {	alert_id: uuid(),
	alert_name: varchar({ length: 255 }),
	description: text(),
	server_id: text(),
	server_name: text(),
	metric_name: varchar({ length: 100 }),
	threshold_value: real(),
	comparison_operator: varchar({ length: 10 }),
	duration_minutes: integer(),
	is_active: boolean(),
	is_triggered: boolean(),
	last_triggered: timestamp({ mode: 'string' }),
	trigger_count_total: integer(),
	alert_status: text(),
	severity: text(),
	minutes_since_last_trigger: numeric(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}).as(sql`SELECT pa.id AS alert_id, pa.name AS alert_name, pa.description, pa.server_id, ms.name AS server_name, pa.metric_name, pa.threshold_value, pa.comparison_operator, pa.duration_minutes, pa.is_active, pa.is_triggered, pa.last_triggered, pa.trigger_count AS trigger_count_total, CASE WHEN pa.is_triggered AND pa.threshold_value >= 1000::double precision THEN 'Active - Critical'::text WHEN pa.is_triggered AND pa.threshold_value >= 500::double precision THEN 'Active - Warning'::text WHEN pa.is_triggered THEN 'Active - Info'::text WHEN pa.is_active AND NOT pa.is_triggered THEN 'Monitoring'::text ELSE 'Inactive'::text END AS alert_status, CASE WHEN pa.threshold_value >= 1000::double precision THEN 'CRITICAL'::text WHEN pa.threshold_value >= 500::double precision THEN 'WARNING'::text ELSE 'INFO'::text END AS severity, CASE WHEN pa.last_triggered IS NOT NULL THEN EXTRACT(epoch FROM now() - pa.last_triggered::timestamp with time zone) / 60::numeric ELSE NULL::numeric END AS minutes_since_last_trigger, pa.created_at, pa.updated_at FROM performance_alerts pa LEFT JOIN mcp_server ms ON pa.server_id = ms.id ORDER BY pa.is_triggered DESC, pa.threshold_value DESC, pa.last_triggered DESC`);