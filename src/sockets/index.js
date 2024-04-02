import { Server } from "socket.io";
import { createServer } from "http";
import { p2pEvents } from "./p2p.socket.js";

/**
 * Represents a SocketIO server.
 */
class SocketIO {
    constructor() {
        this.io = null;
    }

    /**
     * Connects the SocketIO server to the provided app.
     * @param {Object} app - The app to connect the server to.
     * @returns {Promise<Object>} A promise that resolves to the http server.
     */
    async connect(app) {
        try {
            const httpServer = createServer(app);
            this.io = new Server(httpServer, {
                cors: {
                    origin: process.env.CORS_ORIGIN,
                    methods: ["GET", "POST"],
                },
            });
            this.#registerEvents();
            console.log("Created socket server successfully...");
            return Promise.resolve(httpServer);
        } catch (error) {
            console.log("Unable to connect to socket server", error);
            process.exit(1);
        }
    }

    /**
     * Registers events for the SocketIO server.
     */
    #registerEvents() {
        p2pEvents(this.io);
    }
}

export default new SocketIO();
