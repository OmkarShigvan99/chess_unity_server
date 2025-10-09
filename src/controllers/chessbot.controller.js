import { Room } from "../models/room.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { getBestMove } from "../utils/stockfish-engine.js";
import redisDb from "../db/database.redis.js";
import { ROOM_TIMEOUT } from "../constants.js";

import { StockfishEngine } from "../utils/stockfish-engine.js";

const stockfish = new StockfishEngine();

/**
 * Asynchronously joins a room.
 *
 * @param {Object} data - The data object containing the roomId, playerId, isGuest, name, rating, color, and avatar.
 * @param {Function} [callback=() => {}] - An optional callback function.
 * @returns {Promise<void>} - A promise that resolves when the room is joined.
 * @throws {ApiError} - Throws an ApiError if there is an error during the room joining.
 */

export async function joinRoom(data, callback = () => {}, namespace = null) {
    try {
        const {
            roomId,
            playerId,
            isGuest,
            name,
            rating,
            color,
            avatar,
            stockfishLevel = 3, // Default to medium level
        } = data;

        this.join(roomId);

        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);
        const room = Room.fromPrototype(JSON.parse(value));
        room.addPlayer({ id: playerId, name, rating, avatar }, color);
        room.addPlayer(
            {
                id: "stockfish17",
                name: "Stockfish 17",
                rating: 3634,
                avatar: "https://res.cloudinary.com/dovggvhlz/image/upload/v1759834952/stockfish_vxhduv.jpg",
            },
            color === "white" ? "black" : "white"
        );

        await redisDb.redis.set(key, JSON.stringify(room));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        // Use passed namespace or fallback to socket's namespace
        const namespaceToUse = namespace || this.nsp;

        // Notify all players in the room that stockfish has connected
        namespaceToUse.to(roomId).emit("user-connected", {
            id: "stockfish17",
            name: "Stockfish 17",
            rating: 3634,
            avatar: "https://res.cloudinary.com/dovggvhlz/image/upload/v1759834952/stockfish_vxhduv.jpg",
        });

        // if rejoined and both players are present, check if the chessbot is white and the current board fen is w turn play the move
        if (
            (room.players.white &&
                room.players.white.id === "stockfish17" &&
                room.board &&
                room.board.split(" ")[1] === "w") ||
            (room.players.black &&
                room.players.black.id === "stockfish17" &&
                room.board &&
                room.board.split(" ")[1] === "b")
        ) {
            setTimeout(async () => {
                const bestMove = await stockfish.getBestMove(room.board, {
                    level: stockfishLevel,
                });
                const move = {
                    from: bestMove.slice(0, 2),
                    to: bestMove.slice(2, 4),
                    promotion: bestMove.length > 4 ? bestMove[4] : null,
                };
                namespaceToUse.to(roomId).emit("remote-move", {
                    move,
                    history: room.history,
                });
            }, 2000);
        }

        // if the player is black make stockfish play white and send e4 as the first move after 2 seconds
        if (color === "black" && room.history.length === 0) {
            setTimeout(async () => {
                const bestMove = await stockfish.getBestMove(Room.initialFEN, {
                    level: stockfishLevel,
                });
                const move = {
                    from: bestMove.slice(0, 2),
                    to: bestMove.slice(2, 4),
                };
                namespaceToUse.to(roomId).emit("remote-move", {
                    move,
                    history: [],
                });
            }, 2000);
        }

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

export async function sendMove(data, callback = () => {}, namespace = null) {
    try {
        const { roomId, isGuest, move, FEN, history, stockfishLevel } = data;
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
        console.log("LEVEL RECEIVED: ", stockfishLevel);
        const bestMove = await stockfish.getBestMove(FEN, {
            level: stockfishLevel || 3, // Default to medium level
        });
        const botMove = {
            from: bestMove.slice(0, 2),
            to: bestMove.slice(2, 4),
            promotion: bestMove.length > 4 ? bestMove[4] : null,
        };

        namespace.to(roomId).emit("remote-move", {
            move: botMove,
            history: [...history],
        });

        callback({
            ...new ApiResponse(200, botMove, "Successfully sent move"),
        });
    } catch (error) {
        callback({
            ...new ApiResponse(500, null, error.message),
        });
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
    console.log("Reset game called with data:", data);
    try {
        const { roomId, isGuest, stockfishLevel } = data;
        const key = `chessunity:rooms:${
            isGuest ? "guest" : "member"
        }:${roomId}`;
        const value = await redisDb.redis.get(key);
        console.log("value from redis:", value);
        const room = Room.fromPrototype(JSON.parse(value));
        room.board = Room.initialFEN;
        room.previousMove = null;
        room.history = [];

        await redisDb.redis.set(key, JSON.stringify(room));
        await redisDb.redis.expire(key, ROOM_TIMEOUT);

        // if rejoined and both players are present, check if the chessbot is white and the current board fen is w turn play the move
        if (room.players.white && room.players.white.id === "stockfish17") {
            console.log("Stockfish is white, making the first move");
            setTimeout(async () => {
                const bestMove = await stockfish.getBestMove(room.board, {
                    level: stockfishLevel || 3, // Default to medium level
                });
                const move = {
                    from: bestMove.slice(0, 2),
                    to: bestMove.slice(2, 4),
                    promotion: bestMove.length > 4 ? bestMove[4] : null,
                };
                this.to(roomId).emit("remote-move", {
                    move,
                    history: room.history,
                });
            }, 2000);
        }
    } catch (error) {
        console.log(error);
    }
}
