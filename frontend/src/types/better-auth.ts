/**
 * Better-Auth Type Extensions
 *
 * This file is the SINGLE SOURCE OF TRUTH for all Better-Auth types.
 * It extends Better-Auth types to include our custom fields and provides
 * type safety for our authentication implementation.
 *
 * DO NOT define Better-Auth types elsewhere - import from this file.
 */

// Import base types from better-auth
import type { User as BetterAuthUser, Account as BetterAuthAccount, Session as BetterAuthSession } from "better-auth/types";

// =============================================================================
// CORE BETTER-AUTH TYPE EXTENSIONS
// =============================================================================

// Role types - SINGLE SOURCE OF TRUTH (do not duplicate elsewhere)
export type BetterAuthRole = "admin" | "server_owner" | "user";

// Custom fields interface definitions (to be used with intersection types)
export interface UserExtensions {
  role: BetterAuthRole;
  tenantId?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  preferences?: {
    theme?: "light" | "dark" | "system";
    notifications?: boolean;
    language?: string;
  };
  twoFactorEnabled?: boolean;
  backupCodes?: string[] | null;
  termsAcceptedAt?: Date | null;
  privacyAcceptedAt?: Date | null;
}

export interface AccountExtensions {
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  tokenType?: string | null;
  providerAccountId?: string | null;
  refreshTokenRotationEnabled?: boolean;
}

export interface SessionExtensions {
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  } | null;
  lastActivityAt?: Date | null;
  isRevoked?: boolean;
  revokedAt?: Date | null;
  revokedReason?: string | null;
}

// Note: Module augmentation removed to avoid TypeScript conflicts
// Better-Auth will use its base types, we provide extended versions below

// =============================================================================
// RUNTIME TYPES (ACTUAL API RESPONSES)
// =============================================================================

// The actual account object returned by Better-Auth listUserAccounts at runtime
// This differs from the declared Account type schema
export interface RuntimeAccount {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
  scopes: string[];
  // Note: tokens (accessToken, refreshToken, idToken) are not exposed
  // in runtime API responses for security reasons
}

// =============================================================================
// EXPORTED TYPES FOR EXTERNAL USE
// =============================================================================

// Base types from better-auth (for backward compatibility)
export type { BetterAuthUser, BetterAuthAccount, BetterAuthSession };

// Extended types - these include our custom fields through module augmentation
export type ExtendedUser = BetterAuthUser & {
  role: BetterAuthRole;
  tenantId?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  preferences?: {
    theme?: "light" | "dark" | "system";
    notifications?: boolean;
    language?: string;
  };
  twoFactorEnabled?: boolean;
  backupCodes?: string[] | null;
  termsAcceptedAt?: Date | null;
  privacyAcceptedAt?: Date | null;
};

export type ExtendedAccount = BetterAuthAccount & {
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  tokenType?: string | null;
  providerAccountId?: string | null;
  refreshTokenRotationEnabled?: boolean;
};

export type ExtendedSession = BetterAuthSession & {
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  } | null;
  lastActivityAt?: Date | null;
  isRevoked?: boolean;
  revokedAt?: Date | null;
  revokedReason?: string | null;
};

// Note: User, Account, Session are augmented via module declaration above
// They can be imported directly from "better-auth/types" with our extensions

// =============================================================================
// OAUTH & PROVIDER TYPES
// =============================================================================

// Microsoft OAuth profile interface for type safety
export interface MicrosoftProfile {
  id?: string;
  sub?: string;
  name?: string;
  displayName?: string;
  email?: string;
  mail?: string;
  userPrincipalName?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email_verified?: boolean;
  // Azure AD role claims
  roles?: string[] | string;
  appRoles?: string[] | string;
  app_roles?: string[] | string;
  groups?: string[] | string; // Can be string or array depending on configuration
  wids?: string[] | string; // Well-known IDs for Azure AD built-in roles
}

// OAuth tokens interface
export interface OAuthTokens {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

// OAuth provider configuration types
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  scope?: string;
  prompt?: string;
  mapProfileToUser?: (profile: unknown, tokens: OAuthTokens) => Partial<BetterAuthUser>;
}

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  authority?: string;
  scope?: string;
  prompt?: string;
  mapProfileToUser: (profile: MicrosoftProfile, tokens: OAuthTokens) => Partial<BetterAuthUser>;
}

// =============================================================================
// AUTHENTICATION SESSION TYPES
// =============================================================================

// Authentication session with proper typing
export interface AuthSession {
  user: ExtendedUser;
  session: ExtendedSession;
}

// =============================================================================
// UTILITY & INFRASTRUCTURE TYPES
// =============================================================================

// Better-Auth logger interface (matches the expected interface)
export interface BetterAuthLogger {
  disabled?: boolean;
  disableColors?: boolean;
  level?: "debug" | "info" | "warn" | "error";
  log: (level: "debug" | "info" | "warn" | "error", message: string, ...args: unknown[]) => void;
  debug?: (message: string, ...args: unknown[]) => void;
  info?: (message: string, ...args: unknown[]) => void;
  warn?: (message: string, ...args: unknown[]) => void;
  error?: (message: string, ...args: unknown[]) => void;
}
