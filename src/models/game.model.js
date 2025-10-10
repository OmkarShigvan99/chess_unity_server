import mongoose from "mongoose";
const gameSchema = new mongoose.Schema(
    {
        hostId: {
            type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String for guest users
            required: true,
        },
        roomId: {
            type: String,
            required: true,
            // Remove unique constraint - multiple games can be played in the same room
        },
        gameInstanceId: {
            type: String,
            required: true,
            unique: true, // Each game instance must be unique
        },
        players: {
            white: {
                id: {
                    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String for guest users
                },
                name: {
                    type: String,
                    required: true,
                },
                rating: {
                    type: Number,
                },
                avatar: {
                    type: String,
                },
            },
            black: {
                id: {
                    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String for guest users
                },
                name: {
                    type: String,
                    required: true,
                },
                rating: {
                    type: Number,
                },
                avatar: {
                    type: String,
                },
            },
        },
        lastBoardState: {
            type: String,
            required: true,
        },
        moves: {
            type: mongoose.Schema.Types.Mixed, // Allow flexible move format (objects or strings)
            default: [],
        },
        status: {
            type: String,
            enum: [
                "completed",
                "ongoing",
                "draw",
                "pending",
                "resigned",
                "timeout",
            ],
            default: "pending",
        },
        winner: {
            type: String,
            default: "",
            enum: ["white", "black", ""],
        },
        drawReason: {
            type: String,
            default: "",
        },
        winReason: {
            type: String,
            default: "",
        },
        gameType: {
            type: String,
            enum: ["p2p", "tournament", "bot", "online"],
        },
        tournamentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
        },
    },
    { timestamps: true }
);

export const Game = mongoose.model("Game", gameSchema);
