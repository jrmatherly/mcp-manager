#!/bin/bash

# Reset database and generate clean migrations for Better-Auth dual-system architecture
# This is for a greenfield project - no backward compatibility needed

set -e

echo "🔄 Resetting database for clean Better-Auth integration..."

# Navigate to frontend directory
cd "$(dirname "$0")/.."

# Backup existing migrations (just in case)
echo "📦 Backing up existing migrations..."
mkdir -p drizzle/backup-$(date +%Y%m%d-%H%M%S)
cp drizzle/*.sql drizzle/backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true
cp drizzle/meta/* drizzle/backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true

# Drop the database (will prompt for confirmation)
echo "⚠️  WARNING: This will DROP and recreate the database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

# Drop and recreate database
echo "🗑️  Dropping database..."
npm run db:drop || true

echo "✨ Creating fresh database..."
npm run db:create

# Remove problematic migrations
echo "🧹 Cleaning up old migrations..."
rm -f drizzle/20250913223220_thankful_shinobi_shaw.sql
rm -f drizzle/20250914000514_small_slapstick.sql
rm -f drizzle/meta/20250913223220_snapshot.json
rm -f drizzle/meta/20250914000514_snapshot.json

# Generate fresh migrations
echo "🔨 Generating fresh migrations..."
npm run db:generate

# Apply migrations
echo "📝 Applying migrations..."
npm run db:migrate

# Seed database (optional)
echo "🌱 Seeding database with test data..."
npm run db:seed || true

echo "✅ Database reset complete!"
echo ""
echo "Next steps:"
echo "1. Test OAuth authentication flow"
echo "2. Test API key generation in Better-Auth"
echo "3. Test API key validation in FastMCP"
echo "4. Verify dual-system authentication works"