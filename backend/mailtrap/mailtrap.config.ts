import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const mailtrapClient = new MailtrapClient({
	token: process.env.MAILTRAP_TOKEN as string,
});

// Sender information can be overridden via environment variables.
// New env vars:
// - MAILTRAP_SENDER_EMAIL
// - MAILTRAP_SENDER_NAME
// If these are not set, we keep the original defaults for backward compatibility.
export const sender = {
	email: (process.env.MAILTRAP_SENDER_EMAIL as string) || "mailtrap@demomailtrap.com",
	name: (process.env.MAILTRAP_SENDER_NAME as string) || "MERN Auth",
};
