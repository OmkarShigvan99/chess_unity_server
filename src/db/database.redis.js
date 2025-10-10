/**
 * This module exports an instance of the RedisDB class.
 * The RedisDB class is a wrapper around the ioredis library.
 */

import { Redis } from "ioredis";

/**
 * Class representing a Redis database.
 */
class RedisDB {
    /**
     * Create a Redis database.
     */
    constructor() {
        // The Redis client instance
        this.redis = null;
    }

    /**
     * Connect to the Redis database.
     * @return {Promise} A promise that resolves when the connection is successful, and rejects when there is an error.
     */
    async connect() {
        try {
            // Clean the Redis URL by removing any encoded quotes
            let redisUrl = process.env.REDIS_URL;
            if (redisUrl) {
                // Remove encoded quotes and any surrounding quotes
                redisUrl = redisUrl.replace(/%22/g, "").replace(/^"|"$/g, "");
            }

            if (!redisUrl) {
                throw new Error("REDIS_URL environment variable is not set");
            }

            console.log(
                "Connecting to Redis with URL:",
                redisUrl.replace(/:[^:@]*@/, ":***@")
            ); // Log URL with masked password

            // Create a new Redis client instance with proper TLS configuration for Upstash
            this.redis = new Redis(redisUrl, {
                tls: {},
                retryDelayOnFailover: 100,
                enableReadyCheck: false,
                lazyConnect: true,
            });

            // Add error handler
            this.redis.on("error", (err) => {
                console.error("Redis connection error:", err.message);
            });

            // Add connect handler
            this.redis.on("connect", () => {
                console.log("Redis connected successfully");
            });

            // Test the connection
            await this.redis.ping();

            console.log("Connected to Redis successfully...");
            return Promise.resolve();
        } catch (error) {
            console.error("Redis connection failed:", error.message);
            // If there is an error, reject the promise with the error
            return Promise.reject(error);
        }
    }

    /**
     * Disconnect from the Redis database.
     * @return {Promise} A promise that resolves when the disconnection is successful, and rejects when there is an error.
     */
    async disconnect() {
        try {
            // Disconnect from the Redis server
            this.redis.disconnect();

            return Promise.resolve();
        } catch (error) {
            // If there is an error, reject the promise with the error
            return Promise.reject(error);
        }
    }
}

// Export an instance of the RedisDB class
export default new RedisDB();
