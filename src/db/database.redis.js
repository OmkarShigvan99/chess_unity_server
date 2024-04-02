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
            // Create a new Redis client instance
            this.redis = new Redis({
                host: process.env.REDIS_HOST, // The host of the Redis server
                port: process.env.REDIS_PORT, // The port of the Redis server
                lazyConnect: true, // If true, the connection is established lazily
            });

            // Connect to the Redis server
            await this.redis.connect();
            console.log(
                `Connected to Redis successfully... ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
            );
            return Promise.resolve();
        } catch (error) {
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
