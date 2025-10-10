import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(
                401,
                "Autherization Error",
                "Unauthorized request"
            );
        }

        const decodeToken = await jwt.verify(
            token,
            process.env.generateAccessTokenSecret
        );

        if (!decodeToken) {
            throw new ApiError(
                401,
                "Autherization Error",
                "Invalid access Token"
            );
        }

        const user = await User.findById(decodeToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(
                401,
                "Autherization Error",
                "Unauthorized token for the user"
            );
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            401,
            "Autherization Error",
            error.message || "Invalid Token"
        );
    }
});
