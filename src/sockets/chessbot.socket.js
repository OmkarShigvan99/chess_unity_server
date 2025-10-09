import {
    joinRoom,
    resetGame,
    sendMove,
} from "../controllers/chessbot.controller.js";
import { getRoom, leaveRoom } from "../controllers/p2p.controller.js";

export function chessBotEvents(io) {
    // Create a new namespace for chessbot communication
    const chessBot = io.of("/chessbot");

    // Listen for a new connection
    chessBot.on("connection", (socket) => {
        // When a client emits "join-room", bind the joinRoom function with both socket and namespace context
        socket.on("join-room", (data, callback) => {
            joinRoom.call(socket, data, callback, chessBot);
        });

        // When a client emits "leave-room", bind the leaveRoom function from p2p.controller.js to the socket
        socket.on("leave-room", leaveRoom.bind(socket));

        // When a client emits "get-room", bind the getRoom function from p2p.controller.js to the socket
        socket.on("get-room", getRoom.bind(socket));

        // Listen for a move from a client
        socket.on("move", (data, callback) => {
            sendMove.call(socket, data, callback, chessBot);
        });

        // Listen for game reset request
        socket.on("reset", resetGame.bind(chessBot));
    });
}
