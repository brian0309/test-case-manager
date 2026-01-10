import React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Loader } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/Input";
import { useAuthStore } from "../store/authStore";
import GoogleLoginButton from "../components/GoogleLoginButton";

const LoginPage: React.FC = () => {
	const [email, setEmail] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const navigate = useNavigate();

	const { login, isLoading, error } = useAuthStore();

	const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
		e.preventDefault();
		try {
			await login(email, password);
			const { user } = useAuthStore.getState();
			if (user && !user.isVerified) {
				navigate("/verify-email");
			}
		} catch (error) {
			// Error is already set in the store
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-md w-full bg-background-paper dark:bg-background-darkPaper border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden'
		>
			<div className='p-8'>
				<h2 className='text-3xl font-bold mb-6 text-center text-primary dark:text-darkPrimary'>
					Welcome Back
				</h2>

				<form onSubmit={handleLogin}>
					<Input
						icon={Mail}
						type='email'
						placeholder='Email Address'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
						title="Please enter a valid email address"
					/>

					<Input
						icon={Lock}
						type='password'
						placeholder='Password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>

					<div className='flex items-center mb-6'>
						<Link to='/forgot-password' className='text-sm text-primary dark:text-darkPrimary hover:underline'>
							Forgot password?
						</Link>
					</div>
					{error && <p className='text-error font-semibold mb-2'>{error}</p>}

					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className='w-full py-3 px-4 bg-primary dark:bg-primary-darkMode text-text-contrast dark:text-primary-darkModeContrast font-bold rounded-lg shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition duration-200'
						type='submit'
						disabled={isLoading}
					>
						{isLoading ? <Loader className='w-6 h-6 animate-spin  mx-auto' /> : "Login"}
					</motion.button>

												<div className="flex items-center my-6 w-full">
													<div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
													<span className="px-2 text-text-secondary dark:text-text-darkSecondary bg-background-paper dark:bg-background-darkPaper z-10">Or continue with</span>
													<div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
												</div>

					<GoogleLoginButton />
				</form>
			</div>
			<div className='px-8 py-4 bg-background-paper dark:bg-background-darkPaper border-t border-gray-200 dark:border-gray-700 flex justify-center'>
				<p className='text-sm text-text-secondary dark:text-text-darkSecondary'>
					Don't have an account?{" "}
					<Link to='/signup' className='text-primary dark:text-darkPrimary hover:underline'>
						Sign up
					</Link>
				</p>
			</div>
		</motion.div>
	);
};
export default LoginPage;
