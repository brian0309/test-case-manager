import React from "react";
import { motion } from "framer-motion";

const LoadingSpinner: React.FC = () => {
	return (
		<div className='min-h-screen flex items-center justify-center relative overflow-hidden bg-background'>
			{/* Simple Loading Spinner */}
			<motion.div
				className='w-16 h-16 border-4 border-t-4 border-t-green-500 border-green-200 rounded-full'
				animate={{ rotate: 360 }}
				transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
			/>
		</div>
	);
};

export default LoadingSpinner;
