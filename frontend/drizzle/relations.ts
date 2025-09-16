import { relations } from "drizzle-orm/relations";
import { user, account, session, two_factor_auth, user_permission, tenant, tenant_invitation, tenant_member, tenant_usage, mcp_server, mcp_prompt, mcp_resource, mcp_server_dependency, mcp_server_health_check, mcp_tool, system_announcement, announcement_acknowledgment, feature_flag, feature_flag_evaluation, circuit_breakers, connection_pools, enhanced_api_keys, performance_alerts, request_logs, request_queues, server_access_control, server_metrics, sessions, tenants, users, mcp_servers, routing_rules, system_configs, audit_logs, api_keys, server_tools, server_resources } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.user_id],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions_user_id: many(session),
	two_factor_auths: many(two_factor_auth),
	user_permissions_user_id: many(user_permission, {
		relationName: "user_permission_user_id_user_id"
	}),
	user_permissions_granted_by: many(user_permission, {
		relationName: "user_permission_granted_by_user_id"
	}),
	enhanced_api_keys: many(enhanced_api_keys),
	request_logs: many(request_logs),
	server_access_controls: many(server_access_control),
	sessions_user_id: many(sessions),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.user_id],
		references: [user.id]
	}),
}));

export const two_factor_authRelations = relations(two_factor_auth, ({one}) => ({
	user: one(user, {
		fields: [two_factor_auth.user_id],
		references: [user.id]
	}),
}));

export const user_permissionRelations = relations(user_permission, ({one}) => ({
	user_user_id: one(user, {
		fields: [user_permission.user_id],
		references: [user.id],
		relationName: "user_permission_user_id_user_id"
	}),
	user_granted_by: one(user, {
		fields: [user_permission.granted_by],
		references: [user.id],
		relationName: "user_permission_granted_by_user_id"
	}),
}));

export const tenant_invitationRelations = relations(tenant_invitation, ({one}) => ({
	tenant: one(tenant, {
		fields: [tenant_invitation.tenant_id],
		references: [tenant.id]
	}),
}));

export const tenantRelations = relations(tenant, ({many}) => ({
	tenant_invitations: many(tenant_invitation),
	tenant_members: many(tenant_member),
	tenant_usages: many(tenant_usage),
	enhanced_api_keys: many(enhanced_api_keys),
	request_logs: many(request_logs),
	server_access_controls: many(server_access_control),
}));

export const tenant_memberRelations = relations(tenant_member, ({one}) => ({
	tenant: one(tenant, {
		fields: [tenant_member.tenant_id],
		references: [tenant.id]
	}),
}));

export const tenant_usageRelations = relations(tenant_usage, ({one}) => ({
	tenant: one(tenant, {
		fields: [tenant_usage.tenant_id],
		references: [tenant.id]
	}),
}));

export const mcp_promptRelations = relations(mcp_prompt, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [mcp_prompt.server_id],
		references: [mcp_server.id]
	}),
}));

export const mcp_serverRelations = relations(mcp_server, ({many}) => ({
	mcp_prompts: many(mcp_prompt),
	mcp_resources: many(mcp_resource),
	mcp_server_dependencies_server_id: many(mcp_server_dependency, {
		relationName: "mcp_server_dependency_server_id_mcp_server_id"
	}),
	mcp_server_dependencies_depends_on_server_id: many(mcp_server_dependency, {
		relationName: "mcp_server_dependency_depends_on_server_id_mcp_server_id"
	}),
	mcp_server_health_checks: many(mcp_server_health_check),
	mcp_tools: many(mcp_tool),
	circuit_breakers: many(circuit_breakers),
	connection_pools: many(connection_pools),
	performance_alerts: many(performance_alerts),
	request_logs: many(request_logs),
	request_queues: many(request_queues),
	server_access_controls: many(server_access_control),
	server_metrics: many(server_metrics),
}));

export const mcp_resourceRelations = relations(mcp_resource, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [mcp_resource.server_id],
		references: [mcp_server.id]
	}),
}));

export const mcp_server_dependencyRelations = relations(mcp_server_dependency, ({one}) => ({
	mcp_server_server_id: one(mcp_server, {
		fields: [mcp_server_dependency.server_id],
		references: [mcp_server.id],
		relationName: "mcp_server_dependency_server_id_mcp_server_id"
	}),
	mcp_server_depends_on_server_id: one(mcp_server, {
		fields: [mcp_server_dependency.depends_on_server_id],
		references: [mcp_server.id],
		relationName: "mcp_server_dependency_depends_on_server_id_mcp_server_id"
	}),
}));

export const mcp_server_health_checkRelations = relations(mcp_server_health_check, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [mcp_server_health_check.server_id],
		references: [mcp_server.id]
	}),
}));

export const mcp_toolRelations = relations(mcp_tool, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [mcp_tool.server_id],
		references: [mcp_server.id]
	}),
}));

export const announcement_acknowledgmentRelations = relations(announcement_acknowledgment, ({one}) => ({
	system_announcement: one(system_announcement, {
		fields: [announcement_acknowledgment.announcement_id],
		references: [system_announcement.id]
	}),
}));

export const system_announcementRelations = relations(system_announcement, ({many}) => ({
	announcement_acknowledgments: many(announcement_acknowledgment),
}));

export const feature_flag_evaluationRelations = relations(feature_flag_evaluation, ({one}) => ({
	feature_flag: one(feature_flag, {
		fields: [feature_flag_evaluation.flag_id],
		references: [feature_flag.id]
	}),
}));

export const feature_flagRelations = relations(feature_flag, ({many}) => ({
	feature_flag_evaluations: many(feature_flag_evaluation),
}));

export const circuit_breakersRelations = relations(circuit_breakers, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [circuit_breakers.server_id],
		references: [mcp_server.id]
	}),
}));

export const connection_poolsRelations = relations(connection_pools, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [connection_pools.server_id],
		references: [mcp_server.id]
	}),
}));

export const enhanced_api_keysRelations = relations(enhanced_api_keys, ({one, many}) => ({
	user: one(user, {
		fields: [enhanced_api_keys.user_id],
		references: [user.id]
	}),
	tenant: one(tenant, {
		fields: [enhanced_api_keys.tenant_id],
		references: [tenant.id]
	}),
	server_access_controls: many(server_access_control),
}));

export const performance_alertsRelations = relations(performance_alerts, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [performance_alerts.server_id],
		references: [mcp_server.id]
	}),
}));

export const request_logsRelations = relations(request_logs, ({one}) => ({
	user: one(user, {
		fields: [request_logs.user_id],
		references: [user.id]
	}),
	tenant: one(tenant, {
		fields: [request_logs.tenant_id],
		references: [tenant.id]
	}),
	mcp_server: one(mcp_server, {
		fields: [request_logs.target_server_id],
		references: [mcp_server.id]
	}),
}));

export const request_queuesRelations = relations(request_queues, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [request_queues.server_id],
		references: [mcp_server.id]
	}),
}));

export const server_access_controlRelations = relations(server_access_control, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [server_access_control.server_id],
		references: [mcp_server.id]
	}),
	user: one(user, {
		fields: [server_access_control.user_id],
		references: [user.id]
	}),
	tenant: one(tenant, {
		fields: [server_access_control.tenant_id],
		references: [tenant.id]
	}),
	enhanced_api_key: one(enhanced_api_keys, {
		fields: [server_access_control.api_key_id],
		references: [enhanced_api_keys.id]
	}),
}));

export const server_metricsRelations = relations(server_metrics, ({one}) => ({
	mcp_server: one(mcp_server, {
		fields: [server_metrics.server_id],
		references: [mcp_server.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(user, {
		fields: [sessions.user_id],
		references: [user.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [users.tenant_id],
		references: [tenants.id]
	}),
	audit_logs: many(audit_logs),
	api_keys: many(api_keys),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	users: many(users),
	mcp_servers: many(mcp_servers),
	routing_rules: many(routing_rules),
	system_configs: many(system_configs),
	audit_logs: many(audit_logs),
	api_keys: many(api_keys),
}));

export const mcp_serversRelations = relations(mcp_servers, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [mcp_servers.tenant_id],
		references: [tenants.id]
	}),
	server_tools: many(server_tools),
	server_resources: many(server_resources),
}));

export const routing_rulesRelations = relations(routing_rules, ({one}) => ({
	tenant: one(tenants, {
		fields: [routing_rules.tenant_id],
		references: [tenants.id]
	}),
}));

export const system_configsRelations = relations(system_configs, ({one}) => ({
	tenant: one(tenants, {
		fields: [system_configs.tenant_id],
		references: [tenants.id]
	}),
}));

export const audit_logsRelations = relations(audit_logs, ({one}) => ({
	user: one(users, {
		fields: [audit_logs.user_id],
		references: [users.id]
	}),
	tenant: one(tenants, {
		fields: [audit_logs.tenant_id],
		references: [tenants.id]
	}),
}));

export const api_keysRelations = relations(api_keys, ({one}) => ({
	user: one(users, {
		fields: [api_keys.user_id],
		references: [users.id]
	}),
	tenant: one(tenants, {
		fields: [api_keys.tenant_id],
		references: [tenants.id]
	}),
}));

export const server_toolsRelations = relations(server_tools, ({one}) => ({
	mcp_server: one(mcp_servers, {
		fields: [server_tools.server_id],
		references: [mcp_servers.id]
	}),
}));

export const server_resourcesRelations = relations(server_resources, ({one}) => ({
	mcp_server: one(mcp_servers, {
		fields: [server_resources.server_id],
		references: [mcp_servers.id]
	}),
}));