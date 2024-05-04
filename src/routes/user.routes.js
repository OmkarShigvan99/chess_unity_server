import { Router } from "express";
import {
    loginUser,
    registerUser,
    logoutUser,
    changeCurrentPassword,
    updateAccountDetails,
    getCurrentUser,
    refreshAccessToken,
    updateUserAvatar,
    getAllUsers,
    forgotPassword,
    resetPassword,
} from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router
    .route("/register")
    .post(upload.fields([{ name: "avatar", maxCount: 1 }]), registerUser);

router.route("/login").post(loginUser);
// Authorized Routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:resetToken").patch(resetPassword);
router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/update-account").patch(verifyJwt, updateAccountDetails);
router.route("/refresh-token").post(refreshAccessToken);
router
    .route("/avatar")
    .patch(verifyJwt, upload.single("avatar"), updateUserAvatar);

router.route("/get-users").get(getAllUsers);

export default router;
