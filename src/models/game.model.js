import mongoose from "mongoose";
const gameSchema = new mongoose.Schema(
    {
        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        roomId: {
            type: String,
            required: true,
        },
        players: [
            {
                white: {
                    id: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User",
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
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User",
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
        ],
        lastBoardState: {
            type: String,
            required: true,
        },
        moves: [
            {
                type: String,
                required: true,
            },
        ],
        status: {
            type: String,
            enum: ["win", "ongoing", "draw", "pending", "resign", "timeout"],
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
            enum: ["P2P", "tournament", "online"],
        },
        tournamentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
        },
    },
    { timestamps: true }
);

export const Game = mongoose.model("Game", gameSchema);
