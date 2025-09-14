/**
 * Redis client configuration for Better-Auth secondary storage
 * Provides high-performance caching for session and API key validation
 */

import { createClient } from "redis";
import { createLogger } from "./logger";
import { env } from "../env";

// Create Redis-specific logger
const logger = createLogger("redis");

// Redis client instance (will be initialized once)
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create Redis client instance
 */
export async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = env.REDIS_URL || "redis://localhost:6379";

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error("Max reconnection attempts reached", { retries });
            return new Error("Redis connection failed");
          }
          // Exponential backoff with max 5 seconds
          return Math.min(retries * 100, 5000);
        },
      },
    });

    // Error handling
    redisClient.on("error", (err) => {
      logger.error("Redis Client Error", { error: err.message, stack: err.stack });
    });

    redisClient.on("connect", () => {
      logger.info("Connected successfully");
    });

    redisClient.on("ready", () => {
      logger.info("Ready for commands");
    });

    // Connect to Redis
    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Better-Auth Secondary Storage implementation using Redis
 * This provides high-performance caching for sessions and API keys
 */
export const redisSecondaryStorage = {
  /**
   * Get a value from Redis
   */
  get: async (key: string): Promise<string | null> => {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);
      return value;
    } catch (error) {
      logger.error(`GET error for key ${key}`, { key, error: error instanceof Error ? error.message : String(error) });
      // Return null on error to fall back to database
      return null;
    }
  },

  /**
   * Set a value in Redis with optional TTL
   */
  set: async (key: string, value: string, ttl?: number): Promise<void> => {
    try {
      const client = await getRedisClient();
      if (ttl && ttl > 0) {
        // Set with expiration (TTL in seconds)
        await client.setEx(key, ttl, value);
      } else {
        // Set without expiration
        await client.set(key, value);
      }
    } catch (error) {
      logger.error(`SET error for key ${key}`, { key, error: error instanceof Error ? error.message : String(error), ttl });
      // Silently fail - the database will still work
    }
  },

  /**
   * Delete a value from Redis
   */
  delete: async (key: string): Promise<void> => {
    try {
      const client = await getRedisClient();
      await client.del(key);
    } catch (error) {
      logger.error(`DELETE error for key ${key}`, { key, error: error instanceof Error ? error.message : String(error) });
      // Silently fail - the database will still work
    }
  },
};

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}
