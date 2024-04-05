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
        throw getError;
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
        throw getError;
    }
});

/**
 * Asynchronously gets a room.
 * @param {string} data - A JSON string containing the room details.
 * @throws {ApiError} Throws an ApiError if there is an error during the room retrieval.
 * @throws {ApiError} Throws an ApiError if the room is not found.
 */
export async function getRoom(data, callback = () => {}) {
    try {
        const { roomId, isGuest } = JSON.parse(data);
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
 * Asynchronously joins a player to a room.
 * @param {string} data - A JSON string containing the player and room details.
 * @param {Function} [callback=() => {}] - An optional callback function.
 * @throws {ApiError} Throws an ApiError if there is an error during the room joining.
 */
export async function joinRoom(data, callback = () => {}) {
    try {
        const { roomId, playerId, isGuest, name, rating, color, avatar } =
            JSON.parse(data);

        this.join(roomId);

        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);

        const room = Room.fromPrototype(JSON.parse(value));
        room.addPlayer({ id: playerId, name, rating, avatar }, color);

        await redisDb.redis.set(key, JSON.stringify(room));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        this.to(roomId).emit(
            "user-connected",
            JSON.stringify({
                id: playerId,
                name,
                rating,
                color,
                avatar,
            })
        );

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
        const { roomId, playerId, isGuest, name, rating } = JSON.parse(data);

        this.leave(roomId);

        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);

        const room = Room.fromPrototype(JSON.parse(value));
        room.removePlayer(playerId);

        await redisDb.redis.set(key, JSON.stringify(room));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        this.to(roomId).emit(
            "user-disconnected",
            JSON.stringify({
                id: playerId,
                name,
                rating,
            })
        );

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
 * @param {data} data - A JSON string containing the room and move details.
 */
export async function sendMove(data) {
    const { roomId, isGuest, move, FEN, pgn } = JSON.parse(data);
    try {
        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);
        const roomData = Room.fromPrototype(JSON.parse(value));
        roomData.board = FEN;
        roomData.pgn = pgn;

        await redisDb.redis.set(key, JSON.stringify(roomData));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        this.to(roomId).emit("move", JSON.stringify(move));
    } catch (error) {
        console.log(error);
    }
}
