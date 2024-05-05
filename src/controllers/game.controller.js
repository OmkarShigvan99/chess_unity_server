import { Game } from "../models/game.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createGame = asyncHandler(async (req, res) => {
    try {
        const {
            roomId,
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
        const gameData = {
            roomId,
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
        const {} = req.body;

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

export { createGame, getGame, updateGame, deleteGame };
