import mongoose, { Schema } from "mongoose";
import { IUserDocument } from "../types/user.types.js";

// Email validation regex - requires proper domain with TLD
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const userSchema = new Schema<IUserDocument>(
	{
		email: {
			type: String,
			required: function (this: IUserDocument) { return !this.googleId; },
			unique: true,
			validate: {
				validator: function (email: string) {
					return emailRegex.test(email);
				},
				message: 'Please enter a valid email address with a proper domain'
			}
		},
		password: {
			type: String,
			required: function (this: IUserDocument) { return !this.googleId; },
		},
		name: {
			type: String,
			required: true,
		},
		lastLogin: {
			type: Date,
			default: Date.now,
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		resetPasswordToken: String,
		resetPasswordExpiresAt: Date,
		verificationToken: String,
		verificationTokenExpiresAt: Date,
		verificationTokenSentAt: Date,
		// Google OAuth fields
		googleId: {
			type: String,
			unique: true,
			sparse: true
		},
		profilePicture: String,
		geminiApiKey: {
			type: String,
			select: false // Always exclude by default for security
		},
		geminiModel: {
			type: String,
			default: 'gemini-2.5-flash'
		}
	},
	{ timestamps: true }
);


// Indexes for performance optimization
userSchema.index({ verificationToken: 1, verificationTokenExpiresAt: 1 }); // For email verification with expiry check
userSchema.index({ resetPasswordToken: 1, resetPasswordExpiresAt: 1 }); // For password reset with expiry check

export const User = mongoose.model<IUserDocument>("User", userSchema);
