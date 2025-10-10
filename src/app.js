import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import { ApiError } from "./utils/ApiError.js";
const app = express();

// Configurations and middlewares

// Enabling CORS with specific origin and credentials
app.use(
    cors({
        origin: [process.env.CORS_ORIGIN, "http://localhost:8000"], // Setting the origin for CORS
        credentials: true, // Allowing cookies to be sent with CORS
    })
);

app.use(
    morgan(
        ' " :status :method  :response-time ms  :url HTTP/:http-version" :res[content-length]  ":user-agent" :remote-addr [:date[clf]] '
    )
);

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";
import tournamentRouter from "./routes/tournament.routes.js";
import p2pRouter from "./routes/p2p.routes.js";
import gameRouter from "./routes/game.routes.js";
import healthRouter from "./routes/health.routes.js";

// Using the imported routes
app.use("/api/v1/users", userRouter); // User routes
app.use("/api/v1/tournaments", tournamentRouter); // Tournament routes
app.use("/api/v1/p2p", p2pRouter); // P2P routes
app.use("/api/v1/games", gameRouter); // Game routes
app.use("/api/v1", healthRouter); // Health check routes

// Global error handler middleware (must be after all routes)
app.use((err, req, res, next) => {
    // If it's an ApiError instance, use its sendResponse method
    if (err instanceof ApiError) {
        return err.sendResponse(res);
    }

    // For other errors, send a generic 500 response
    return res.status(500).json({
        title: "Internal Server Error",
        message: err.message || "Something went wrong",
    });
});

// Exporting the configured Express application
export default app;
