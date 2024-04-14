import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/upload.cloudinary.js";

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
// TODO: send mail to user for Mail verification
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

// TODO: send mail to user for password change
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!(currentPassword || newPassword)) {
        // throw new ApiError(400, "All fields must be requried");
        const getError = new ApiError(
            401,
            "Missing field error",
            "All fields must be requried"
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

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
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
// TODO: send mail to user for account update
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    if (!(name, email)) {
        // throw new ApiError(400, "Fileds are requried to update");
        const getError = new ApiError(
            400,
            "Account Update Error",
            "Fileds are requried to update"
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
};
