import { GMAIL_PASSWORD } from "@/config/env";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "sanjayvarmadommati@gmail.com",
        pass: GMAIL_PASSWORD,
    },
});