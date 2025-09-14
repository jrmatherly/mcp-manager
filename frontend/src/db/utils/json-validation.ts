/**
 * Database JSON Validation Utilities
 *
 * Provides runtime validation for JSON fields before database operations.
 * Ensures data integrity and prevents malformed JSON from entering the database.
 */

import { z } from "zod";
import { JSON_FIELD_SCHEMAS, type JsonFieldName } from "../schema/json-schemas";
import { dbLogger } from "../../lib/logger";

/**
 * Database operation context
 */
interface DbOperationContext {
  operation: "insert" | "update" | "select";
  table: string;
  userId?: string;
  tenantId?: string;
  batchIndex?: number;
}

/**
 * Validation error with detailed context
 */
export class JsonValidationError extends Error {
  constructor(public readonly fieldName: string, public readonly originalError: z.ZodError, public readonly context?: DbOperationContext) {
    super(`JSON validation failed for ${fieldName}: ${originalError.message}`);
    this.name = "JsonValidationError";
  }

  /**
   * Get formatted error details
   */
  get details() {
    return {
      field: this.fieldName,
      errors: this.originalError.issues,
      context: this.context,
    };
  }
}

/**
 * Validates a JSON field before database operations
 */
export function validateDbJsonField<T = unknown>(fieldName: JsonFieldName, data: unknown, context?: DbOperationContext): T {
  const schema = JSON_FIELD_SCHEMAS[fieldName];
  if (!schema) {
    throw new Error(`No validation schema found for field: ${fieldName}`);
  }

  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new JsonValidationError(fieldName, error, context);
    }
    throw error;
  }
}

/**
 * Safely validates a JSON field with fallback
 */
export function safeValidateDbJsonField<T = unknown>(
  fieldName: JsonFieldName,
  data: unknown,
  fallback?: T,
  context?: DbOperationContext,
): T | null {
  const schema = JSON_FIELD_SCHEMAS[fieldName];
  if (!schema) {
    dbLogger.warn(`No validation schema found for field: ${fieldName}`, { fieldName });
    return fallback ?? null;
  }

  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (context?.operation === "insert") {
      // Log validation errors for new data
      dbLogger.error(`JSON validation failed for ${fieldName}`, {
        fieldName,
        error: error instanceof Error ? error.message : String(error),
        context,
      });
    }
    return fallback ?? null;
  }
}

/**
 * Validates multiple JSON fields in a record
 */
export function validateDbJsonFields(
  record: Record<string, unknown>,
  fieldMappings: Record<string, JsonFieldName>,
  context?: DbOperationContext,
): Record<string, unknown> {
  const validated: Record<string, unknown> = { ...record };

  for (const [recordKey, schemaKey] of Object.entries(fieldMappings)) {
    if (recordKey in record && record[recordKey] !== null) {
      validated[recordKey] = validateDbJsonField(schemaKey, record[recordKey], context);
    }
  }

  return validated;
}

/**
 * Sanitizes JSON fields before database operations
 */
export function sanitizeJsonFields(record: Record<string, unknown>, fieldMappings: Record<string, JsonFieldName>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...record };

  for (const [recordKey, schemaKey] of Object.entries(fieldMappings)) {
    if (recordKey in record && record[recordKey] !== null) {
      // Remove any additional properties not defined in schema
      sanitized[recordKey] = safeValidateDbJsonField(schemaKey, record[recordKey]);
    }
  }

  return sanitized;
}

/**
 * Pre-insert validation middleware for JSON fields
 */
export function validateBeforeInsert<T extends Record<string, unknown>>(
  table: string,
  data: T,
  fieldMappings: Record<keyof T, JsonFieldName>,
  context?: Partial<DbOperationContext>,
): T {
  const fullContext: DbOperationContext = {
    operation: "insert",
    table,
    ...context,
  };

  return validateDbJsonFields(data, fieldMappings as Record<string, JsonFieldName>, fullContext) as T;
}

/**
 * Pre-update validation middleware for JSON fields
 */
export function validateBeforeUpdate<T extends Record<string, unknown>>(
  table: string,
  data: Partial<T>,
  fieldMappings: Record<keyof T, JsonFieldName>,
  context?: Partial<DbOperationContext>,
): Partial<T> {
  const fullContext: DbOperationContext = {
    operation: "update",
    table,
    ...context,
  };

  return validateDbJsonFields(data, fieldMappings as Record<string, JsonFieldName>, fullContext) as Partial<T>;
}

/**
 * Type-safe field mapping helpers for common tables
 */
export const FIELD_MAPPINGS = {
  user: {
    preferences: "user.preferences" as const,
    backupCodes: "user.backup_codes" as const,
  },
  session: {
    deviceInfo: "session.device_info" as const,
  },
  tenant: {
    features: "tenant.features" as const,
    settings: "tenant.settings" as const,
  },
  tenantMember: {
    permissions: "tenant_member.permissions" as const,
  },
  tenantUsage: {
    usageDetails: "tenant_usage.usage_details" as const,
  },
  featureFlag: {
    targetingRules: "feature_flag.targeting_rules" as const,
    environments: "feature_flag.environments" as const,
  },
  apiToken: {
    rateLimit: "api_token.rate_limit" as const,
  },
  mcpServer: {
    authConfig: "mcp_server.auth_config" as const,
    capabilities: "mcp_server.capabilities" as const,
    settings: "mcp_server.settings" as const,
  },
  auditLog: {
    changes: "audit_log.changes" as const,
    metadata: "audit_log.metadata" as const,
  },
} as const;

/**
 * Quick validation functions for specific tables
 */
export const validateUserData = (data: Record<string, unknown>) => validateDbJsonFields(data, FIELD_MAPPINGS.user);

export const validateTenantData = (data: Record<string, unknown>) => validateDbJsonFields(data, FIELD_MAPPINGS.tenant);

export const validateMcpServerData = (data: Record<string, unknown>) => validateDbJsonFields(data, FIELD_MAPPINGS.mcpServer);

/**
 * Batch validation for array operations
 */
export function validateBatchData<T extends Record<string, unknown>>(
  table: string,
  dataArray: T[],
  fieldMappings: Record<keyof T, JsonFieldName>,
  context?: Partial<DbOperationContext>,
): T[] {
  return dataArray.map((data, index) => {
    const indexedContext: DbOperationContext = {
      operation: "insert" as const,
      table,
      batchIndex: index,
      ...context,
    };

    try {
      return validateDbJsonFields(data, fieldMappings as Record<string, JsonFieldName>, indexedContext) as T;
    } catch (error) {
      if (error instanceof JsonValidationError) {
        throw new JsonValidationError(error.fieldName, error.originalError, {
          ...error.context,
          batchIndex: index,
          operation: error.context?.operation || "insert",
          table: error.context?.table || table,
        });
      }
      throw error;
    }
  });
}

/**
 * Runtime schema validation health check
 */
export function validateSchemaHealth(): {
  totalSchemas: number;
  validationErrors: string[];
  missingSchemas: string[];
} {
  const validationErrors: string[] = [];
  const missingSchemas: string[] = [];

  // Test each schema with minimal valid data
  for (const [fieldName, schema] of Object.entries(JSON_FIELD_SCHEMAS)) {
    try {
      // Test with empty object (most schemas should handle this gracefully)
      (schema as z.ZodSchema).parse({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Check if it's a legitimate validation error or missing schema
        if (error.issues.some((e) => e.code === "invalid_type")) {
          // Schema requires specific properties, this is expected
          continue;
        }
        validationErrors.push(`${fieldName}: ${error.message}`);
      }
    }
  }

  return {
    totalSchemas: Object.keys(JSON_FIELD_SCHEMAS).length,
    validationErrors,
    missingSchemas,
  };
}
