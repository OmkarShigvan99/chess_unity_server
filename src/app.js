// Importing necessary modules
import express from "express"; // Express.js for creating the server
import cookieParser from "cookie-parser"; // Cookie-parser to parse cookies attached to the client request object
import cors from "cors"; // CORS to enable Cross-Origin Resource Sharing

// Creating an Express application
const app = express();

// Configurations and middlewares

// Enabling CORS with specific origin and credentials
app.use(
    cors({
        origin: process.env.CORS_ORIGIN, // Setting the origin for CORS
        credentials: true, // Allowing cookies to be sent with CORS
    })
);

// Parsing incoming request bodies in a middleware before the handlers
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Parsing URL-encoded data
app.use(express.static("public")); // Serving static files
app.use(express.json({ limit: "16kb" })); // Parsing JSON data
app.use(cookieParser()); // Parsing Cookie header and populating req.cookies with an object keyed by the cookie names

// Importing routes
import userRouter from "./routes/user.routes.js";
import tournamentRouter from "./routes/tournament.routes.js";
import p2pRouter from "./routes/p2p.routes.js";

// Using the imported routes
app.use("/api/v1/users", userRouter); // User routes
app.use("/api/v1/tournaments", tournamentRouter); // Tournament routes
app.use("/api/v1/p2p", p2pRouter); // P2P routes

// Exporting the configured Express application
export default app;
