import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { mailHelper } from "../utils/mailHelper.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/upload.cloudinary.js";
import crypto from "crypto";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        // throw new ApiError(
        //     500,
        //     `Something went Wrong while generating tokens ${error}`
        // );
        const getError = new ApiError(401, "Login Error", "User not found");
        getError.sendResponse(res);
        throw (getError.error = error);
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { name, username, email, password } = req.body;

    if (!name || !username || !password || !email) {
        // throw new ApiError(400, "All fields are required");
        const getError = new ApiError(
            401,
            "Registration Error",
            "All fields are required"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (existedUser) {
        // throw new ApiError(400, "username or email is already exists ");
        const getError = new ApiError(
            401,
            "Registration Error",
            "username or email is already exists"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const user = await User.create({
        name,
        username: username?.toLowerCase(),
        email,
        password,
    });

    const checkUserCreate = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!checkUserCreate) {
        // throw new ApiError(500, "Something Went wrong while creating a user");
        const getError = new ApiError(
            401,
            "Registration Error",
            "Something Went wrong while creating a user"
        );
        getError.sendResponse(res);
        throw getError;
    }
    // send mail to welcome user

    const message = `Welcome to ChessUnity ${name}, you have successfully registered with us. Enjoy the game.`;
    try {
        mailHelper({
            to: email,
            subject: "Welcome to ChessUnity",
            text: message,
        });
    } catch (error) {
        const getError = new ApiError(
            401,
            "Registration Error",
            "Email could not be sent"
        );
        getError.sendResponse(res);
        throw error;
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                checkUserCreate,
                "User has been successfully Created"
            )
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!(email || username)) {
        // throw new ApiError("Email or username field is required");
        const getError = new ApiError(
            401,
            "Missing Field Error",
            "Email or username field is required"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (!user) {
        // throw new ApiError(401, "User Not found ");
        const getError = new ApiError(401, "Login Error", "User not found");
        getError.sendResponse(res);
        throw getError;
    }

    const checkPasswordCorrect = await user.isPasswordCorrect(password);
    if (!checkPasswordCorrect) {
        // throw new ApiError(401, "Incorrect Password");
        const getError = new ApiError(401, "Login Error", "Incorrect Password");
        getError.sendResponse(res);
        throw getError;
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "user Logged In Successfully."
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req?.user._id,
        {
            $unset: { refreshToken: 1 },
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User Logged out Successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!(currentPassword || newPassword)) {
        // throw new ApiError(400, "All fields must be required");
        const getError = new ApiError(
            401,
            "Missing field error",
            "All fields must be required"
        );
        getError.sendResponse(res);
        throw getError;
    }

    if (newPassword !== confirmNewPassword) {
        // throw new ApiError(401, "Password does not match ");
        const getError = new ApiError(
            401,
            "Password Change Error",
            "Password does not match"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) {
        // throw new ApiError(401, "Password is incorrect");
        const getError = new ApiError(
            401,
            "Password Change Error",
            "Password is incorrect"
        );
        getError.sendResponse(res);
        throw getError;
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: true });

    // send mail to user for password is changed
    const message = `Your password has been changed successfully. If you did not make this change, please reset.`;
    try {
        mailHelper({
            to: user.email,
            subject: "Password Changed",
            text: message,
        });
    } catch (error) {
        // throw new ApiError(401, "Email could not be sent");
        const getError = new ApiError(
            401,
            "Email Error",
            "Email could not be sent"
        );
        getError.sendResponse(res);
        throw error;
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        // throw new ApiError(400, "Email is required");
        const getError = new ApiError(
            401,
            "field required error",
            "Email is required"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const user = await User.findOne({ email });

    if (!user) {
        // throw new ApiError(404, "User not found");
        const getError = new ApiError(
            404,
            "Email Error",
            `User not found with email ${email}`
        );
        getError.sendResponse(res);
        throw getError;
    }

    // generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get(
        "host"
    )}/api/v1/users/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
        mailHelper({
            to: user.email,
            subject: "ChessUnity Password reset token",
            text: message,
        });

        return res
            .status(200)
            .json(new ApiResponse(203, {}, "Email sent successfully"));
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save({ validateBeforeSave: false });

        const getError = new ApiError(
            401,
            "Email Error",
            "Email could not be sent"
        );

        getError.sendResponse(res);
        throw error;
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { password, confirmPassword } = req.body;

    if (
        !(password || confirmPassword) ||
        password !== confirmPassword ||
        !resetToken
    ) {
        // throw new ApiError(400, "All fields are required");
        const getError = new ApiError(
            401,
            "Reset Password Error",
            "All fields are required or password does not match"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const user = await User.findOne({
        passwordResetToken: resetPasswordToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        // throw new ApiError(400, "Invalid Token or Token Expired");
        const getError = new ApiError(
            401,
            "Reset Password Error",
            "Invalid Token or Token Expired"
        );

        getError.sendResponse(res);
        throw getError;
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(203, {}, "Password Reset Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const getUser = await User.findById(req.user._id).select("-password");
    if (!getUser) {
        // throw new ApiError(404, "User not found Unauthorized request...");
        const getError = new ApiError(
            401,
            "Unauthorized request",
            "User not found"
        );
        getError.sendResponse(res);
        throw getError;
    }

    return res.status(200).json(new ApiResponse(200, getUser, "User Found"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    if (!(name || email)) {
        // throw new ApiError(400, "Fields are required to update");
        const getError = new ApiError(
            400,
            "Account Update Error",
            "Fields are required to update"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { name: name, email: email },
        },
        { new: true }
    ).select("-password");

    if (!user) {
        // throw new ApiError(500, "Something went Wrong while updating the data");
        const getError = new ApiError(
            500,
            "Account Update Error",
            "Something went Wrong while updating the data"
        );
        getError.sendResponse(res);
        throw getError;
    }
    // send mail to user for account update
    const message = `Your account has been updated successfully. If you did not make this change, please contact us.`;
    try {
        mailHelper({
            to: user.email,
            subject: "Account Updated",
            text: message,
        });
    } catch (error) {
        // throw new ApiError(401, "Email could not be sent");
        const getError = new ApiError(
            401,
            "Email Error",
            "Email could not be sent"
        );
        getError.sendResponse(res);
        throw error;
    }
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Data has been updated successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken ||
        req.header("Authentication")?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
        // throw new ApiError(401, "Unauthorized request...");
        const getError = new ApiError(
            401,
            "Unauthorized request...",
            "Refresh Token is missing"
        );
        getError.sendResponse(res);
        throw getError;
    }

    const decodeToken = await jwt.verify(
        incomingRefreshToken,
        process.env.generateAccessTokenSecret
    );

    try {
        const user = await User.findById(decodeToken._id);

        if (!user) {
            // throw new ApiError(401, "invalid Token");
            const getError = new ApiError(401, "invalid Token");
            getError.sendResponse(res);
            throw getError;
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            // throw new ApiError(401, "Refresh Token is expired or used");
            const getError = new ApiError(
                401,
                "Refresh Token Error",
                "Refresh Token is expired or used"
            );
            getError.sendResponse(res);
            throw getError;
        }

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        refreshToken: newRefreshToken,
                        accessToken,
                    },
                    "Access Token Refreshed"
                )
            );
    } catch (error) {
        // throw new ApiError(401, error?.message || "invalid Refresh Token");
        const getError = new ApiError(401, "invalid Refresh Token");
        getError.sendResponse(res);
        throw (getError.error = error);
    }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // check if avatar is already present or not for deleting the previous one
    const user = await User.findById(req.user?._id);

    if (user.avatar) {
        const deletePreviousAvatar = await deleteFromCloudinary(user.avatar.id);

        if (!deletePreviousAvatar) {
            // throw new ApiError(400, "Error while deleting previous avatar...");
            const getError = new ApiError(401, "Avatar Delete Error");
            getError.sendResponse(res);
            throw getError;
        }
    }
    const avatarLocalPath = req.file.path;

    if (!avatarLocalPath) {
        // throw new ApiError(400, "avatar file is missing");
        const getError = new ApiError(401, "Avatar Update Error");
        getError.sendResponse(res);
        throw getError;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        // throw new ApiError(400, "Error while uploading avatar...");
        const getError = new ApiError(401, "Avatar Update Error");
        getError.sendResponse(res);
        throw getError;
    }
    user.avatar = {
        id: avatar.public_id,
        url: avatar.secure_url,
    };
    user.save({ validateBeforeSave: false }, { new: true });
    user.password = undefined;
    user.refreshToken = undefined;
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updates successfully..."));
});

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select("-password");
    if (!users) {
        // throw new ApiError(500, "Users Fetch Error", "Users not found");
        const getError = new ApiError(
            500,
            "Users Fetch Error",
            "Users not found"
        );
        getError.sendResponse(res);
        throw getError;
    }
    return res
        .status(200)
        .json(new ApiResponse(200, users, "All Users found successfully"));
});

const getGameStats = asyncHandler(async (req, res) => {});
const updateGameStats = asyncHandler(async (req, res) => {});
export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    refreshAccessToken,
    updateUserAvatar,
    getAllUsers,
    getGameStats,
    updateGameStats,
    forgotPassword,
    resetPassword,
};
