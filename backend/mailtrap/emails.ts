import {
	PASSWORD_RESET_REQUEST_TEMPLATE,
	PASSWORD_RESET_SUCCESS_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
	WELCOME_TEMPLATE,
} from "./emailTemplates.js";
import { mailtrapClient, sender } from "./mailtrap.config.js";

export const sendVerificationEmail = async (email: string, verificationToken: string): Promise<void> => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Verify your email",
			html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
			category: "Email Verification",
		});

		console.log("Email sent successfully", response);
	} catch (error) {
		console.error(`Error sending verification`, error);

		throw new Error(`Error sending verification email: ${error}`, { cause: error });
	}
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
	const recipient = [{ email }];

	try {
		// Prefer a Mailtrap-hosted template UUID configured via env var.
		const templateUuid = process.env.MAILTRAP_WELCOME_TEMPLATE_UUID;

		if (templateUuid) {
			try {
				const response = await mailtrapClient.send({
					from: sender,
					to: recipient,
					template_uuid: templateUuid,
					template_variables: {
						company_info_name: "Auth Company",
						name: name,
					},
				});

				console.log("Welcome email (template) sent successfully", response);
				return;
			} catch (err) {
				// If template not found or other Mailtrap issue, log and fall back to HTML send below.
				console.error("Mailtrap template send failed, falling back to HTML. Error:", err);
			}
		}

		// Fallback: send using local HTML template so emails still go out even if the Mailtrap template is missing.
		const html = WELCOME_TEMPLATE.replace(/{name}/g, name).replace(/{company_info_name}/g, "Auth Company");
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Welcome to Auth Company",
			html,
			category: "Welcome",
		});

		console.log("Welcome email (html) sent successfully", response);
	} catch (error) {
		console.error(`Error sending welcome email`, error);

		throw new Error(`Error sending welcome email: ${error}`, { cause: error });
	}
};

export const sendPasswordResetEmail = async (email: string, resetURL: string): Promise<void> => {
	const recipient = [{ email }];

	try {
		await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Reset your password",
			html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
			category: "Password Reset",
		});
	} catch (error) {
		console.error(`Error sending password reset email`, error);

		throw new Error(`Error sending password reset email: ${error}`, { cause: error });
	}
};

export const sendResetSuccessEmail = async (email: string): Promise<void> => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Password Reset Successful",
			html: PASSWORD_RESET_SUCCESS_TEMPLATE,
			category: "Password Reset",
		});

		console.log("Password reset email sent successfully", response);
	} catch (error) {
		console.error(`Error sending password reset success email`, error);

		throw new Error(`Error sending password reset success email: ${error}`, { cause: error });
	}
};
