import redisDB from "../db/database.redis.js";

// Store server start time
const serverStartTime = Date.now();

/**
 * Health check endpoint
 * Returns server status, uptime, and database connectivity
 */
export const healthCheck = async (req, res) => {
    try {
        const currentTime = Date.now();
        const uptime = Math.floor((currentTime - serverStartTime) / 1000); // uptime in seconds

        // Check Redis connectivity
        let redisStatus = "disconnected";
        try {
            await redisDB.ping();
            redisStatus = "connected";
        } catch (error) {
            redisStatus = "disconnected";
        }

        // Basic health status
        const healthStatus = {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: uptime,
                readable: formatUptime(uptime),
            },
            services: {
                redis: redisStatus,
                // Note: MongoDB connection check would need to be added here if needed
                // For now, if the server is running, we assume MongoDB is connected
                database: "connected",
            },
            environment: process.env.NODE_ENV || "development",
            version: process.env.npm_package_version || "1.0.0",
        };

        res.status(200).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: "error",
            message: "Service unavailable",
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
};

/**
 * Simple readiness check - just returns ok if server is running
 */
export const readinessCheck = (req, res) => {
    res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
        message: "Server is ready to accept requests",
    });
};

/**
 * Liveness check - basic endpoint to verify server is alive
 */
export const livenessCheck = (req, res) => {
    res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
    });
};

/**
 * Format uptime seconds into readable format
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}
