# Reset Database Script Analysis

**Date**: September 14, 2025
**Status**: ⚠️ Script Needs Update
**Recommendation**: Replace with TypeScript implementation

## Current Issues with reset-database.sh

### 1. Missing npm Scripts
The script references commands that don't exist in package.json:
- `npm run db:drop` - ❌ Not defined
- `npm run db:create` - ❌ Not defined

### 2. Outdated Migration References
The script tries to remove specific migration files that may not exist:
- `20250913223220_thankful_shinobi_shaw.sql`
- `20250914000514_small_slapstick.sql`

### 3. Functionality Already Available
With our new setup.ts script, we have:
- `npm run db:setup` - Creates database and runs migrations
- `npm run db:reset` - Resets database (already exists in migrate.ts)
- `npm run db:seed` - Seeds database with test data

## Recommended Solution

### Option 1: Remove reset-database.sh
Since we now have TypeScript-based database management, the shell script is redundant.

### Option 2: Update package.json with Reset Commands
Add these scripts to package.json:

```json
"db:drop": "tsx src/db/setup.ts drop",
"db:create": "tsx src/db/setup.ts create",
"db:reset:full": "npm run db:drop && npm run db:create && npm run db:migrate && npm run db:optimize"
```

### Option 3: Create TypeScript Reset Script
Create a comprehensive reset function in setup.ts that handles the full reset process.

## Immediate Action: Update setup.ts

Add drop database functionality to setup.ts: