import { Router } from "express";
import {
    createGame,
    getGame,
    updateGame,
    deleteGame,
} from "../controllers/game.controller.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/create-game").post(createGame);

router.route("/get-game/:id").get(getGame);
router.route("/update-game/:id").patch(updateGame);

router.route("/delete-game/:id").delete(deleteGame);

export default router;
