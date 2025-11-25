import React from "react";
import { motion } from "framer-motion";
import Input from "../components/Input";
import { Loader, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { useAuthStore } from "../store/authStore";
import GoogleLoginButton from "../components/GoogleLoginButton";

const SignUpPage: React.FC = () => {
	const [name, setName] = useState<string>("");
	const [email, setEmail] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const navigate = useNavigate();

	const { signup, error, isLoading } = useAuthStore();

	const handleSignUp = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
		e.preventDefault();

		try {
			await signup(email, password, name);
			navigate("/verify-email");
		} catch (error) {
			console.log(error);
		}
	};
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-md w-full bg-background-paper border border-gray-200 rounded-2xl shadow-lg overflow-hidden'
		>
			<div className='p-8'>
				<h2 className='text-3xl font-bold mb-6 text-center text-primary'>
					Create Account
				</h2>

				<form onSubmit={handleSignUp}>
					<Input
						icon={User}
						type='text'
						placeholder='Full Name'
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
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
					{error && <p className='text-error font-semibold mt-2'>{error}</p>}
					<PasswordStrengthMeter password={password} />

										<motion.button
											className="mt-5 w-full py-3 px-4 bg-primary text-text-contrast font-bold rounded-lg shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition duration-200"
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											type="submit"
											disabled={isLoading}
										>
											{isLoading ? <Loader className="w-6 h-6 animate-spin mx-auto" /> : "Sign Up"}
										</motion.button>
					</form>

					{/* Divider and Google Login Button */}
					<div className="flex items-center my-6 w-full">
						<div className="flex-grow border-t border-gray-300"></div>
						<span className="px-2 text-text-secondary bg-background-paper z-10">Or continue with</span>
						<div className="flex-grow border-t border-gray-300"></div>
					</div>
					<GoogleLoginButton />
				</div>
				<div className='px-8 py-4 bg-background-paper border-t border-gray-200 flex justify-center'>
					<p className='text-sm text-text-secondary'>
						Already have an account?{" "}
						<Link to={"/login"} className='text-primary hover:underline'>
							Login
						</Link>
					</p>
				</div>
		</motion.div>
	);
};
export default SignUpPage;
