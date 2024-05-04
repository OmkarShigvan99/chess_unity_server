import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";

import fs from "fs";
import { get } from "http";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return "Local file path is missing";

        // upload file to the cloudinary

        const response = await cloudinary.uploader.upload(localFilePath, {
            folder: "chessUnity",
            resource_type: "auto",
            width: 150,
            crop: "scale",
            allowed_formats: [
                "jpg",
                "png",
                "jpeg",
                "gif",
                "webp",
                "svg",
                "heic",
            ],
        });

        //  file uploaded successfully

        fs.unlinkSync(localFilePath);

        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as upload operation faild

        throw new Error(error.message);
    }
};

// delete image from cloudinary
const deleteFromCloudinary = async (imageId) => {
    try {
        if (!imageId) return "Public id is missing";

        // delete file from the cloudinary

        const response = await cloudinary.uploader.destroy(imageId);

        return response;
    } catch (error) {
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
