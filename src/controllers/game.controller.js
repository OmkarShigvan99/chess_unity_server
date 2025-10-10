import { Game } from "../models/game.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createGame = asyncHandler(async (req, res) => {
    try {
        const {
            roomId,
            gameInstanceId,
            hostId,
            players,
            board: lastBoardState,
            history: moves,
            status,
            winner,
            draw_reason: drawReason,
            win_reason: winReason,
            type: gameType,
            tournamentId,
        } = req.body;

        const requiredFields = {
            roomId,
            gameInstanceId,
            hostId,
            players,
            lastBoardState,
            moves,
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                const getError = new ApiError(
                    400,
                    "Missing Fields",
                    `The field '${key}' is required`
                );
                getError.sendResponse(res);
                throw getError;
            }
        }

        // Check if a game with this game instance ID already exists (deduplication)
        const existingGame = await Game.findOne({ gameInstanceId });
        if (existingGame) {
            console.log(
                `Game with instance ID ${gameInstanceId} already exists, returning existing game`
            );
            return res
                .status(200)
                .json(
                    new ApiResponse(200, existingGame, "Game already exists")
                );
        }

        const gameData = {
            roomId,
            gameInstanceId,
            hostId,
            players,
            lastBoardState,
            moves,
            status: status || undefined,
            winner: winner || undefined,
            drawReason: drawReason || undefined,
            winReason: winReason || undefined,
            gameType: gameType || undefined,
            tournamentId: tournamentId || undefined,
        };

        const game = await Game.create(gameData);

        if (!game) {
            const getError = new ApiError(
                401,
                "Save Game Error",
                "Error saving game to the database"
            );
            getError.sendResponse(res);
        }
        return res
            .status(201)
            .json(new ApiResponse(201, game, "Game created successfully"));
    } catch (error) {
        // Handle MongoDB duplicate key error (E11000)
        if (error.code === 11000 && error.keyPattern?.gameInstanceId) {
            console.log(
                `Duplicate game creation attempt for instance ${req.body.gameInstanceId}`
            );
            // Find and return the existing game
            try {
                const existingGame = await Game.findOne({
                    gameInstanceId: req.body.gameInstanceId,
                });
                return res
                    .status(200)
                    .json(
                        new ApiResponse(
                            200,
                            existingGame,
                            "Game already exists"
                        )
                    );
            } catch (findError) {
                console.error("Error finding existing game:", findError);
            }
        }

        const getError = new ApiError(
            401,
            "Save Game Error",
            "Error saving game to the database"
        );
        getError.sendResponse(res);
        throw error;
    }
});

const updateGame = asyncHandler(async (req, res) => {
    try {
        const {
            board: lastBoardState,
            history: moves,
            status,
            winner,
            draw_reason: drawReason,
            win_reason: winReason,
        } = req.body;

        const game = await Game.findByIdAndUpdate(
            req.params.id,
            {
                ...(lastBoardState && { lastBoardState }),
                ...(moves && { moves }),
                ...(status && { status }),
                ...(winner !== undefined && { winner }),
                ...(drawReason && { drawReason }),
                ...(winReason && { winReason }),
            },
            { new: true }
        );

        if (!game) {
            const getError = new ApiError(
                404,
                "Game Not Found",
                "Game with the given ID not found"
            );
            getError.sendResponse(res);
            return;
        }
        return res
            .status(200)
            .json(new ApiResponse(200, game, "Game updated successfully"));
    } catch (error) {
        const getError = new ApiError(
            401,
            "Update Game Error",
            "Error updating game in the database"
        );
        getError.sendResponse(res);
        throw error;
    }
});

const deleteGame = asyncHandler(async (req, res) => {
    try {
        const game = await Game.findByIdAndDelete(req.params.id);
        if (!game) {
            const getError = new ApiError(
                404,
                "Game Not Found",
                "Game with the given ID not found"
            );
            getError.sendResponse(res);
        }
        return res
            .status(200)
            .json(new ApiResponse(200, game, "Game deleted successfully"));
    } catch (error) {
        const getError = new ApiError(
            401,
            "Delete Game Error",
            "Error deleting game from the database"
        );
        getError.sendResponse(res);
        throw error;
    }
});

const getGame = asyncHandler(async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            const getError = new ApiError(
                404,
                "Game Not Found",
                "Game with the given ID not found"
            );
            getError.sendResponse(res);
        }
        return res
            .status(200)
            .json(new ApiResponse(200, game, "Game retrieved successfully"));
    } catch (error) {
        const getError = new ApiError(
            401,
            "Get Game Error",
            "Error getting game from the database"
        );
        getError.sendResponse(res);
        throw error;
    }
});

const getPlayerStats = asyncHandler(async (req, res) => {
    try {
        const { playerId } = req.params;

        if (!playerId) {
            const getError = new ApiError(
                400,
                "Missing Player ID",
                "Player ID is required to fetch stats"
            );
            getError.sendResponse(res);
            return;
        }

        // Get all completed games for this player
        const games = await Game.find({
            $and: [
                {
                    $or: [
                        { "players.white.id": playerId },
                        { "players.black.id": playerId },
                    ],
                },
                { status: "completed" },
            ],
        }).sort({ createdAt: -1 });

        // Calculate statistics
        let wins = 0;
        let losses = 0;
        let draws = 0;
        let totalGames = games.length;
        let winsByCheckmate = 0;
        let winsByResignation = 0;
        let drawsByStalemate = 0;
        let drawsByAgreement = 0;
        let drawsByInsufficientMaterial = 0;
        let drawsByThreefoldRepetition = 0;
        let gamesAsWhite = 0;
        let gamesAsBlack = 0;
        let winsAsWhite = 0;
        let winsAsBlack = 0;

        const recentGames = [];
        const winStreak = [];
        let currentStreak = 0;
        let longestWinStreak = 0;

        games.forEach((game, index) => {
            const isWhite =
                game.players.white.id.toString() === playerId.toString();
            const isBlack =
                game.players.black.id.toString() === playerId.toString();

            if (isWhite) gamesAsWhite++;
            if (isBlack) gamesAsBlack++;

            // Determine game result for this player
            let result = "draw";
            if (game.winner) {
                if (
                    (isWhite && game.winner === "white") ||
                    (isBlack && game.winner === "black")
                ) {
                    result = "win";
                    wins++;
                    if (isWhite) winsAsWhite++;
                    if (isBlack) winsAsBlack++;

                    // Count win reasons
                    if (game.winReason === "checkmate") winsByCheckmate++;
                    if (game.winReason === "resignation") winsByResignation++;

                    currentStreak++;
                } else {
                    result = "loss";
                    losses++;
                    currentStreak = 0;
                }
            } else {
                draws++;
                currentStreak = 0;

                // Count draw reasons
                if (game.drawReason === "stalemate") drawsByStalemate++;
                if (game.drawReason === "agreement") drawsByAgreement++;
                if (game.drawReason === "insufficient_material")
                    drawsByInsufficientMaterial++;
                if (game.drawReason === "threefold_repetition")
                    drawsByThreefoldRepetition++;
            }

            // Track win streak
            if (currentStreak > longestWinStreak) {
                longestWinStreak = currentStreak;
            }

            // Add to recent games (last 10)
            if (index < 10) {
                recentGames.push({
                    id: game._id,
                    gameInstanceId: game.gameInstanceId,
                    roomId: game.roomId,
                    opponent: isWhite ? game.players.black : game.players.white,
                    playerColor: isWhite ? "white" : "black",
                    result: result,
                    winReason: game.winReason,
                    drawReason: game.drawReason,
                    gameType: game.gameType,
                    createdAt: game.createdAt,
                    movesCount: game.moves ? game.moves.length : 0,
                });
            }
        });

        // Calculate win rate and other percentages
        const winRate =
            totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
        const drawRate =
            totalGames > 0 ? ((draws / totalGames) * 100).toFixed(1) : 0;
        const lossRate =
            totalGames > 0 ? ((losses / totalGames) * 100).toFixed(1) : 0;

        const stats = {
            summary: {
                totalGames,
                wins,
                losses,
                draws,
                winRate: parseFloat(winRate),
                drawRate: parseFloat(drawRate),
                lossRate: parseFloat(lossRate),
                longestWinStreak,
            },
            gameBreakdown: {
                gamesAsWhite,
                gamesAsBlack,
                winsAsWhite,
                winsAsBlack,
                whiteWinRate:
                    gamesAsWhite > 0
                        ? ((winsAsWhite / gamesAsWhite) * 100).toFixed(1)
                        : 0,
                blackWinRate:
                    gamesAsBlack > 0
                        ? ((winsAsBlack / gamesAsBlack) * 100).toFixed(1)
                        : 0,
            },
            winReasons: {
                checkmate: winsByCheckmate,
                resignation: winsByResignation,
            },
            drawReasons: {
                stalemate: drawsByStalemate,
                agreement: drawsByAgreement,
                insufficientMaterial: drawsByInsufficientMaterial,
                threefoldRepetition: drawsByThreefoldRepetition,
            },
            recentGames,
        };

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    stats,
                    "Player statistics retrieved successfully"
                )
            );
    } catch (error) {
        const getError = new ApiError(
            500,
            "Get Player Stats Error",
            "Error retrieving player statistics from the database"
        );
        getError.sendResponse(res);
        throw error;
    }
});

const getGlobalStats = asyncHandler(async (req, res) => {
    try {
        // Get total games count
        const totalGames = await Game.countDocuments({ status: "completed" });

        // Get games by type
        const gamesByType = await Game.aggregate([
            { $match: { status: "completed" } },
            { $group: { _id: "$gameType", count: { $sum: 1 } } },
        ]);

        // Get games by result
        const gamesByResult = await Game.aggregate([
            { $match: { status: "completed" } },
            {
                $group: {
                    _id: {
                        $cond: [{ $eq: ["$winner", ""] }, "draw", "decisive"],
                    },
                    count: { $sum: 1 },
                },
            },
        ]);

        // Get most active players
        const playerActivity = await Game.aggregate([
            { $match: { status: "completed" } },
            {
                $project: {
                    players: [
                        {
                            id: "$players.white.id",
                            name: "$players.white.name",
                        },
                        {
                            id: "$players.black.id",
                            name: "$players.black.name",
                        },
                    ],
                },
            },
            { $unwind: "$players" },
            {
                $group: {
                    _id: "$players.id",
                    name: { $first: "$players.name" },
                    gamesPlayed: { $sum: 1 },
                },
            },
            { $sort: { gamesPlayed: -1 } },
            { $limit: 10 },
        ]);

        // Get recent games
        const recentGames = await Game.find({ status: "completed" })
            .sort({ createdAt: -1 })
            .limit(10)
            .select(
                "gameInstanceId players winner winReason drawReason gameType createdAt"
            );

        const stats = {
            totalGames,
            gamesByType: gamesByType.reduce((acc, item) => {
                acc[item._id || "unknown"] = item.count;
                return acc;
            }, {}),
            gamesByResult: gamesByResult.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            mostActivePlayers: playerActivity,
            recentGames,
        };

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    stats,
                    "Global statistics retrieved successfully"
                )
            );
    } catch (error) {
        const getError = new ApiError(
            500,
            "Get Global Stats Error",
            "Error retrieving global statistics from the database"
        );
        getError.sendResponse(res);
        throw error;
    }
});

export {
    createGame,
    getGame,
    updateGame,
    deleteGame,
    getPlayerStats,
    getGlobalStats,
};
