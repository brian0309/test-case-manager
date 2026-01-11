import React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useNavigate, useParams } from "react-router-dom";
import Input from "../components/Input";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";

const ResetPasswordPage: React.FC = () => {
	const [password, setPassword] = useState<string>("");
	const [confirmPassword, setConfirmPassword] = useState<string>("");
	const { resetPassword, error, isLoading, message } = useAuthStore();

	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
		e.preventDefault();

		if (password !== confirmPassword) {
			alert("Passwords do not match");
			return;
		}
		try {
			await resetPassword(token!, password);

			toast.success("Password reset successfully, redirecting to login page...");
			setTimeout(() => {
				navigate("/login");
			}, 2000);
		} catch (error: any) {
			console.error(error);
			toast.error(error?.message || "Error resetting password");
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden'
		>
			<div className='p-8'>
				<h2 className='text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100'>
					Reset Password
				</h2>
				{error && <p className='text-red-600 dark:text-red-400 text-sm mb-4'>{error}</p>}
				{message && <p className='text-green-600 dark:text-green-400 text-sm mb-4'>{message}</p>}

				<form onSubmit={handleSubmit}>
					<Input
						icon={Lock}
						type='password'
						placeholder='New Password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>

					<Input
						icon={Lock}
						type='password'
						placeholder='Confirm New Password'
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
					/>

					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					className='w-full py-3 px-4 bg-blue-600 dark:bg-blue-600 text-white dark:text-white font-bold rounded-lg shadow hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition duration-200'
						type='submit'
						disabled={isLoading}
					>
						{isLoading ? "Resetting..." : "Set New Password"}
					</motion.button>
				</form>
			</div>
		</motion.div>
	);
};
export default ResetPasswordPage;
