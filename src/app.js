import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
const app = express();

// Configurations and middlewares

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
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
// route declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tournaments", tournamentRouter);
// http;//localhost:3000/api/v1/users/register
export default app;
