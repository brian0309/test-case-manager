import React from "react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import Input from "../components/Input";
import { Loader, Mail } from "lucide-react";
import { Link } from "react-router-dom";


const ForgotPasswordPage: React.FC = () => {
	const [email, setEmail] = useState<string>("");
	const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
	const { isLoading, forgotPassword, error } = useAuthStore();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
		e.preventDefault();
		await forgotPassword(email);
		setIsSubmitted(true);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="max-w-md w-full bg-background-paper dark:bg-background-darkPaper border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden"
		>
			<div className="p-8">
				<h2 className="text-3xl font-bold mb-6 text-center text-primary dark:text-darkPrimary">
					Forgot Password
				</h2>

				{!isSubmitted ? (
					<form onSubmit={handleSubmit}>
						<p className="text-text-secondary dark:text-text-darkSecondary mb-6 text-center">
							Enter your email address and we'll send you a link to reset your password.
						</p>
						<Input
							icon={Mail}
							type="email"
							placeholder="Email Address"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
							title="Please enter a valid email address"
							required
						/>
						{error && <p className="text-error font-semibold mb-2">{error}</p>}
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="w-full py-3 px-4 bg-primary dark:bg-primary-darkMode text-text-contrast dark:text-primary-darkModeContrast font-bold rounded-lg shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition duration-200"
							type="submit"
							disabled={isLoading}
						>
							{isLoading ? <Loader className="w-6 h-6 animate-spin mx-auto" /> : "Send Reset Link"}
						</motion.button>
					</form>
				) : (
					<div className="text-center">
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 500, damping: 30 }}
							className="w-16 h-16 bg-primary dark:bg-primary-darkMode rounded-full flex items-center justify-center mx-auto mb-4"
						>
							<Mail className="h-8 w-8 text-white dark:text-gray-100" />
						</motion.div>
						<p className="text-text-secondary dark:text-text-darkSecondary mb-6">
							If an account exists for {email}, you will receive a password reset link shortly.
						</p>
					</div>
				)}
			</div>
			<div className="px-8 py-4 bg-background-paper dark:bg-background-darkPaper border-t border-gray-200 dark:border-gray-700 flex justify-center">
				<p className="text-sm text-text-secondary dark:text-text-darkSecondary">
					<Link to="/login" className="text-primary dark:text-darkPrimary hover:underline">
						Back to Login
					</Link>
				</p>
			</div>
		</motion.div>
	);
};

export default ForgotPasswordPage;
