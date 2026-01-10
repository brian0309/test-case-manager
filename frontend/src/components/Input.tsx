import React from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	icon: LucideIcon;
}

const Input: React.FC<InputProps> = ({ icon: Icon, ...props }) => {
	return (
		<div className='relative mb-6'>
			<div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
				<Icon className='size-5 text-gray-500 dark:text-gray-400' />
			</div>
			<input
				{...props}
				className='w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-system-blue focus:ring-2 focus:ring-system-blue/20 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition duration-200'
			/>
		</div>
	);
};
export default Input;
