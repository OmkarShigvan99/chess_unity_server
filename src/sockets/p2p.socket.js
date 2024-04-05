/**
 * This module exports a function that sets up event listeners for a socket.io namespace.
 * The namespace is "/p2p", which is used for peer-to-peer communication.
 *
 * @module p2pEvents
 * @param {object} io - The socket.io server instance.
 */

import {
    getRoom,
    joinRoom,
    leaveRoom,
    sendMove,
} from "../controllers/p2p.controller.js";

/**
 * Sets up event listeners for the "/p2p" namespace.
 *
 * @function p2pEvents
 * @param {object} io - The socket.io server instance.
 */
export function p2pEvents(io) {
    // Create a new namespace for p2p communication
    const p2p = io.of("/p2p");

    // Listen for a new connection
    p2p.on("connection", (socket) => {
        // When a client emits "join-room", bind the joinRoom function from p2p.controller.js to the socket
        socket.on("join-room", joinRoom.bind(socket));

        // When a client emits "leave-room", bind the leaveRoom function from p2p.controller.js to the socket
        socket.on("leave-room", leaveRoom.bind(socket));

        // When a client emits "get-room", bind the getRoom function from p2p.controller.js to the socket
        socket.on("get-room", getRoom.bind(socket));

        // Listen for a move from a client
        socket.on("move", sendMove.bind(socket));
    });
}
