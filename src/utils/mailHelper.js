import nodemailer from "nodemailer";
import { asyncHandler } from "./AsyncHandler.js";

const mailHelper = asyncHandler(async (mailOptions) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mail = {
        from: process.env.MAIL_FROM,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
    };
    try {
        await transporter.sendMail(mail);
    } catch (error) {
        throw new Error(error.message);
    }
});

export { mailHelper };
