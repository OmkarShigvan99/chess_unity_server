import redisDb from "../db/database.redis.js";
import { Room } from "../models/room.model.js";
import { DB, ROOM_TIMEOUT } from "../constants.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { nanoid } from "nanoid";

/**
 * Asynchronously creates a new room.
 * @param {Object} req - The HTTP request object, expected to contain query parameters.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise} A promise that resolves to a JSON response containing the created room.
 * @throws {ApiError} Throws an ApiError if there is an error during the room creation.
 */
export const createRoom = asyncHandler(async (req, res) => {
    try {
        const params = req.query;
        const roomId = nanoid(10);

        const key = `${DB}:rooms:${
            params.guest === "true" ? "guest" : "member"
        }:${roomId}`;
        const value = new Room(roomId, params.hostId);

        await redisDb.redis.set(key, JSON.stringify(value), "EX", ROOM_TIMEOUT);

        res.json({ value });
    } catch (error) {
        const getError = new ApiError(
            500,
            "Internal Server Error",
            error.message
        );

        getError.sendResponse(res);
        throw error;
    }
});

/**
 * Asynchronously deletes a room.
 * @param {Object} req - The HTTP request object, expected to contain query parameters.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise} A promise that resolves to a JSON response confirming the deletion of the room.
 * @throws {ApiError} Throws an ApiError if there is an error during the room deletion.
 */
export const deleteRoom = asyncHandler(async (req, res) => {
    try {
        const params = req.query;
        const key = `${DB}:rooms:${
            params.guest === "true" ? "guest" : "member"
        }:${params.roomId}`;

        await redisDb.redis.del(key);

        res.json({ message: "Successfully deleted room" });
    } catch (error) {
        const getError = new ApiError(
            500,
            "Internal Server Error",
            error.message
        );
        getError.sendResponse(res);
        throw error;
    }
});

/**
 * Retrieves a room from the database.
 * @param {Object} data - The data object containing the roomId and isGuest properties.
 * @param {Function} callback - The callback function to be called with the result.
 * @returns {Promise<void>} - A promise that resolves when the room is retrieved.
 */
export async function getRoom(data, callback = () => {}) {
    try {
        const { roomId, isGuest } = data;
        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);

        if (!value) {
            callback({
                ...new ApiResponse(404, null, "Room not found"),
            });
        } else {
            callback({
                ...new ApiResponse(200, JSON.parse(value), "Room found"),
            });
        }
    } catch (error) {
        callback({
            ...new ApiResponse(500, null, "Internal Server Error"),
        });
        console.log(error);
    }
}

/**
 * Joins a room and adds a player to it.
 * @param {Object} data - The data containing information about the room and player.
 * @param {Function} callback - The callback function to be called after joining the room.
 * @returns {Promise<void>} - A promise that resolves after joining the room.
 */
export async function joinRoom(data, callback = () => {}) {
    try {
        const { roomId, playerId, isGuest, name, rating, color, avatar } = data;

        this.join(roomId);

        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);
        const room = Room.fromPrototype(JSON.parse(value));
        room.addPlayer({ id: playerId, name, rating, avatar }, color);

        await redisDb.redis.set(key, JSON.stringify(room));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        this.to(roomId).emit("user-connected", {
            id: playerId,
            name,
            rating,
            color,
            avatar,
        });

        callback({
            ...new ApiResponse(200, room, "Successfully joined room"),
        });
    } catch (error) {
        callback({
            ...new ApiResponse(500, null, error.message),
        });
        console.log(error);
    }
}

/**
 * Asynchronously leaves a player from a room.
 * @param {string} data - A JSON string containing the player and room details.
 * @param {Function} [callback=() => {}] - An optional callback function.
 * @throws {ApiError} Throws an ApiError if there is an error during the room leaving.
 */
export async function leaveRoom(data, callback = () => {}) {
    try {
        const { roomId, playerId, isGuest, name, rating } = data;

        this.leave(roomId);

        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);

        const room = Room.fromPrototype(JSON.parse(value));
        room.removePlayer(playerId);

        await redisDb.redis.set(key, JSON.stringify(room));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        this.to(roomId).emit("user-disconnected", {
            id: playerId,
            name,
            rating,
        });

        if (room.isEmpty()) {
            await redisDb.redis.del(key);
        }

        callback({
            ...new ApiResponse(200, room, "Successfully left room"),
        });
    } catch (error) {
        callback({ ...new ApiResponse(500, null, "Internal Server Error") });
        console.log(error);
    }
}

/**
 * Sends a move to the server and updates the room data.
 * @param {Object} data - The move data.
 * @param {string} data.roomId - The ID of the room.
 * @param {boolean} data.isGuest - Indicates if the player is a guest.
 * @param {string} data.move - The move made by the player.
 * @param {string} data.FEN - The FEN notation of the chess board.
 * @param {Array} data.history - The move history.
 * @returns {Promise<void>} - A promise that resolves when the move is sent and the room data is updated.
 */
export async function sendMove(data) {
    try {
        const { roomId, isGuest, move, FEN, history } = data;
        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);
        const roomData = Room.fromPrototype(JSON.parse(value));
        roomData.board = FEN;
        roomData.previousMove = move;
        roomData.history = history;

        await redisDb.redis.set(key, JSON.stringify(roomData));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        this.to(roomId).emit("remote-move", {
            move,
            history,
        });
    } catch (error) {
        console.log(error);
    }
}

// function to reset the game
/**
 * Resets the game by updating the board, history, and emitting a "game:reset" event.
 * @param {Object} data - The data object containing the roomId and isGuest properties.
 * @returns {Promise<void>} - A promise that resolves when the game is reset.
 */
export async function resetGame(data) {
    try {
        const { roomId, isGuest } = data;
        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);
        const roomData = Room.fromPrototype(JSON.parse(value));
        roomData.board = Room.initialBoard;
        roomData.previousMove = null;
        roomData.history = [];

        await redisDb.redis.set(key, JSON.stringify(roomData));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        this.to(roomId).emit("game:reset", {
            board: roomData.board,
            history: roomData.history,
        });
    } catch (error) {
        console.log(error);
    }
}
