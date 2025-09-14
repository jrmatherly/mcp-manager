#!/usr/bin/env tsx
/**
 * Manual test script for Better-Auth logger integration
 * Run with: npm run tsx scripts/test-better-auth-logger.ts
 */

import "dotenv/config"
import { betterAuthLogger, authLogger } from "../src/lib/logger"

console.log("🧪 Testing Better-Auth Logger Integration\n")

// Test 1: Basic logging functionality
console.log("1️⃣ Testing basic log levels:")
betterAuthLogger.log("debug", "Debug level test message")
betterAuthLogger.log("info", "Info level test message")
betterAuthLogger.log("warn", "Warning level test message")
betterAuthLogger.log("error", "Error level test message")

console.log("\n2️⃣ Testing with context objects:")
betterAuthLogger.log("info", "User authentication", {
  userId: "test-user-123",
  provider: "google",
  timestamp: new Date().toISOString()
})

console.log("\n3️⃣ Testing with mixed arguments:")
betterAuthLogger.log("warn", "Session warning",
  { sessionId: "sess_abc123" },
  "additional_info",
  { severity: "medium" }
)

console.log("\n4️⃣ Testing logger configuration:")
console.log("- Logger disabled:", betterAuthLogger.disabled)
console.log("- Colors disabled:", betterAuthLogger.disableColors)
console.log("- Log level:", betterAuthLogger.level)

console.log("\n5️⃣ Comparing with direct authLogger:")
authLogger.info("Direct authLogger call for comparison", { component: "test" })

console.log("\n✅ Better-Auth logger integration test completed!")
console.log("💡 Check that all Better-Auth messages are prefixed with '[Better-Auth]'")
console.log("💡 Verify that context objects are properly merged")
console.log("💡 Ensure log levels are respected based on LOG_LEVEL environment variable")