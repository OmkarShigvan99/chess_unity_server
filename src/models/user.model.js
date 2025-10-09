import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
        },
        avatar: {
            id: {
                type: String,
            },
            url: {
                type: String,
            },
        },
        gameInfo: {
            rank: {
                type: Number,
                default: 0,
            },
            games: {
                type: String,
                default: 0,
            },
            tournament: {
                type: String,
                default: 0,
            },
        },
        passwordResetToken: String,
        passwordResetExpires: Date,
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    // Only proceed if password field was actually modified
    if (!this.isModified("password")) {
        return next();
    }

    // Check if password exists and is valid before hashing
    if (
        !this.password ||
        typeof this.password !== "string" ||
        this.password.trim().length === 0
    ) {
        return next(
            new Error("Password is required and must be a non-empty string")
        );
    }

    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.generateAccessTokenSecret,
        {
            expiresIn: process.env.accessTokenExpiry,
        }
    );
};

userSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex"); // Generate token
    // Set hashed reset token to database
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    this.passwordResetExpires = Date.now() + 60 * 1000 * 20; // 20 minutes

    return resetToken;
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.generateRefreshTokenSecret,
        {
            expiresIn: process.env.refreshTokenExpiry,
        }
    );
};

export const User = mongoose.model("User", userSchema);
