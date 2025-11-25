import React from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	icon: LucideIcon;
}

const Input: React.FC<InputProps> = ({ icon: Icon, ...props }) => {
	return (
		<div className='relative mb-6'>
			<div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
				<Icon className='size-5 text-primary' />
			</div>
			<input
				{...props}
				className='w-full pl-10 pr-3 py-2 bg-background rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-text-primary placeholder-text-secondary transition duration-200'
			/>
		</div>
	);
};
export default Input;
