/**
 * Class representing a Room.
 */
export class Room {
    /**
     * Create a room.
     * @param {string} roomId - The id of the room.
     * @param {string} hostId - The id of the host.
     */
    constructor(roomId, hostId) {
        this.roomId = roomId;
        this.hostId = hostId;
        this.players = {
            white: null, // The player playing as white.
            black: null, // The player playing as black.
        };
        this.board = null; // The current state of the board.
        this.pgn = null; // The Portable Game Notation (PGN) of the game.
        this.previousMove = null; // The previous move made in the game.
    }

    /**
     * Add a player to the room.
     * @param {Object} player - The player to add.
     * @param {string} color - The color the player will play as ('white' or 'black').
     */
    addPlayer(player, color) {
        this.players[color] = player;
    }

    /**
     * Remove a player from the room.
     * @param {Object} player - The player to remove.
     */
    removePlayer(playerId) {
        if (this.players.white && this.players.white.id === playerId) {
            this.players.white = null;
        } else if (this.players.black && this.players.black.id === playerId) {
            this.players.black = null;
        }
    }

    /**
     * Check if the room is empty.
     * @return {boolean} True if the room is empty, false otherwise.
     */
    isEmpty() {
        return !this.players.white && !this.players.black;
    }

    /**
     * Create a Room object from a prototype.
     * @param {Object} proto - The prototype to create the Room from.
     * @return {Room} The created Room object.
     */
    static fromPrototype(proto) {
        const room = new Room(proto.roomId, proto.hostId);
        room.players = proto.players;
        room.board = proto.board;
        room.pgn = proto.pgn;
        room.previousMove = proto.previousMove;
        return room;
    }
}
