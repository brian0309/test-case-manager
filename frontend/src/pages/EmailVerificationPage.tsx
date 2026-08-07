import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

const EmailVerificationPage: React.FC = () => {
	const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const navigate = useNavigate();

	const { error, isLoading, verifyEmail, resendVerificationCode, message } = useAuthStore();

	const handleChange = (index: number, value: string): void => {
		const newCode = [...code];

		// Handle pasted content
		if (value.length > 1) {
			const pastedCode = value.slice(0, 6).split("");
			for (let i = 0; i < 6; i++) {
				newCode[i] = pastedCode[i] || "";
			}
			setCode(newCode);

			// Focus on the last non-empty input or the first empty one
			const lastFilledIndex = newCode.reduce((lastIndex, digit, index) => 
				digit !== "" ? index : lastIndex, -1);
			const focusIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
			inputRefs.current[focusIndex]?.focus();
		} else {
			newCode[index] = value;
			setCode(newCode);

			// Move focus to the next input field if value is entered
			if (value && index < 5) {
				inputRefs.current[index + 1]?.focus();
			}
		}
	};

	const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === "Backspace" && !code[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();
		const verificationCode = code.join("");
		try {
			await verifyEmail(verificationCode);
			navigate("/");
			toast.success("Email verified successfully");
		} catch {
			// Error is already handled by verifyEmail
		}
	}, [code, verifyEmail, navigate]);

	const handleResendCode = async (): Promise<void> => {
		try {
			await resendVerificationCode();
			toast.success("Verification code sent to your email");
		} catch {
			// Error is already set in the store
		}
	};

	// Auto submit when all fields are filled
	useEffect(() => {
		if (code.every((digit) => digit !== "")) {
			const submitEvent = { preventDefault: () => {} } as React.FormEvent;
			handleSubmit(submitEvent);
		}
	}, [code, handleSubmit]);

	return (
		<div className='max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden'>
			<motion.div
				initial={{ opacity: 0, y: -50 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md'
			>
				<h2 className='text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100'>
					Verify Your Email
				</h2>
				<p className='text-center text-gray-600 dark:text-gray-400 mb-6'>Enter the 6-digit code sent to your email address.</p>

				<form onSubmit={handleSubmit} className='space-y-6'>
					<div className='flex justify-between'>
						{code.map((digit, index) => (
							<input
								key={index}
								ref={(el) => {
								inputRefs.current[index] = el;
							}}
								type='text'
								maxLength={6}
								value={digit}
								onChange={(e) => handleChange(index, e.target.value)}
								onKeyDown={(e) => handleKeyDown(index, e)}
								className='w-12 h-12 text-center text-2xl font-bold bg-background dark:bg-gray-800 text-primary dark:text-darkPrimary border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-system-blue focus:outline-none'
							/>
						))}
					</div>
					{error && <p className='text-error font-semibold mt-2'>{error}</p>}
					{message && <p className='text-success font-semibold mt-2 dark:text-system-green'>{message}</p>}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						type='submit'
						disabled={isLoading || code.some((digit) => !digit)}
						className='w-full bg-primary dark:bg-primary-darkMode text-text-contrast dark:text-primary-darkModeContrast font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50'
					>
						{isLoading ? "Verifying..." : "Verify Email"}
					</motion.button>
				</form>
				<div className='mt-4 text-center'>
					<p className='text-sm text-text-secondary dark:text-text-darkSecondary'>
						Didn't receive the code?{" "}
						<button
							onClick={handleResendCode}
							disabled={isLoading}
							className='text-primary dark:text-darkPrimary hover:underline font-semibold disabled:opacity-50'
						>
							Resend Code
						</button>
					</p>
				</div>
			</motion.div>
		</div>
	);
};
export default EmailVerificationPage;
