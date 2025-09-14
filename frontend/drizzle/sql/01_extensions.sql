-- ============================================================================
-- PostgreSQL Extensions and Utility Functions
-- ============================================================================
-- This file contains PostgreSQL extensions and utility functions required for
-- the MCP Registry Gateway database. Run after Drizzle migrations.
--
-- Execution: psql -d your_database -f 01_extensions.sql
-- ============================================================================

-- ============================================================================
-- POSTGRESQL EXTENSIONS
-- ============================================================================

-- Enable UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions (for enhanced security)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable additional text search capabilities
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to generate UUIDs (compatible with backend UUID generation)
CREATE OR REPLACE FUNCTION generate_uuid()
RETURNS uuid AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Function to get current UTC timestamp
CREATE OR REPLACE FUNCTION utc_now()
RETURNS timestamp AS $$
BEGIN
    RETURN (NOW() AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON EXTENSION "uuid-ossp" IS 'Functions to generate universally unique identifiers (UUIDs)';

COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for PostgreSQL';

COMMENT ON EXTENSION "unaccent" IS 'Text search dictionary that removes accents';

COMMENT ON FUNCTION generate_uuid () IS 'Generate a random UUID v4';

COMMENT ON FUNCTION utc_now () IS 'Get current UTC timestamp without timezone';