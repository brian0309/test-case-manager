import React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import Input from "../components/Input";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

const ChangePasswordPage: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
    const [formError, setFormError] = useState<string>("");
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const { changePassword, clearError, error, isLoading } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setFormError("");
        clearError();

        if (newPassword !== confirmNewPassword) {
            setFormError("New passwords do not match");
            return;
        }

        try {
            await changePassword(currentPassword, newPassword);
            toast.success("Password changed successfully");
            setIsSuccess(true);
            // Clear form on success
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            
            // Reset success message after 3 seconds
            setTimeout(() => {
                setIsSuccess(false);
            }, 3000);
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { status?: number }; message?: string };
            if (axiosError.response && axiosError.response.status === 400) {
                setFormError("Current password is incorrect");
            } else {
                setFormError(axiosError.message || "Error changing password. Please try again.");
            }
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-4xl bg-white rounded-lg shadow-sm p-8"
                    >
                        <div className="flex items-center mb-6">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <h2 className="ml-4 text-2xl font-bold text-gray-900">Password Changed!</h2>
                        </div>
                        <p className="text-gray-600 mb-6">Your password has been updated successfully.</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Back to Dashboard
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-4xl"
                >
                    <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
                        <p className="text-sm text-gray-500 mt-1">Update your account password</p>
                    </div>

                    {(formError || error) && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                            {formError || error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Current Password
                            </label>
                            <Input
                                id="currentPassword"
                                icon={Lock}
                                type="password"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <Input
                                id="newPassword"
                                icon={Lock}
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full"
                            />
                            <div className="mt-2">
                                <PasswordStrengthMeter password={newPassword} />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <Input
                                id="confirmPassword"
                                icon={Lock}
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>

                        <div className="pt-2">
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                                    isLoading 
                                        ? 'bg-blue-400' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </motion.button>
                        </div>
                    </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
