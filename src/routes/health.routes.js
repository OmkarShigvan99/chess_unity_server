import { Router } from "express";
import {
    healthCheck,
    readinessCheck,
    livenessCheck,
} from "../controllers/health.controller.js";

const router = Router();

// Health check endpoint - comprehensive health information
router.route("/health").get(healthCheck);

// Readiness check - is the server ready to accept requests
router.route("/ready").get(readinessCheck);

// Liveness check - is the server alive
router.route("/live").get(livenessCheck);

export default router;
