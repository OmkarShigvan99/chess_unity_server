// Import the Router function from the express module
import { Router } from "express";

// Import the createRoom and deleteRoom functions from the p2p.controller module
import { createRoom, deleteRoom } from "../controllers/p2p.controller.js";

// Create a new router object
const router = Router();

// Set up a GET route at the path "/create-room" that will call the createRoom function when accessed
router.get("/create-room", createRoom);

// Set up a GET route at the path "/delete-room" that will call the deleteRoom function when accessed
router.get("/delete-room", deleteRoom);

// Export the router object as the default export of this module
export default router;
