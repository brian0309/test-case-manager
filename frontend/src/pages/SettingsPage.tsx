import React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import Input from "../components/Input";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { User } from "../types";
import { API_URL } from "../utils/api";
import axios from "axios";

interface Tab {
    id: string;
    label: string;
}

interface GeneralTabProps {
    user: User | null;
}

interface PlaceholderTabProps {
    title: string;
}

const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("general");
    const { user } = useAuthStore();

    const tabs: Tab[] = [
        { id: "general", label: "General" },
        { id: "security", label: "Security" },
        { id: "gemini", label: "Gemini API" },
        { id: "billing", label: "Billing" },
    ];

    return (
        <div className="mx-2 my-6 space-y-6">
            <div className="space-y-6">
                <div className="px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {user?.name || "User"}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage your teams and preferences here.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        <div className="flex space-x-8 overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === "general" && <GeneralTab user={user} />}
                    {activeTab === "security" && <SecurityTab />}
                    {activeTab === "gemini" && <GeminiTab />}
                    {activeTab === "billing" && <PlaceholderTab title="Billing" />}
                </motion.div>
            </div>
        </div>
    );
};

// General Tab Component
const GeneralTab: React.FC<GeneralTabProps> = ({ user }) => {
    return (
        <div className="mac-card">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Basics</h2>

                {/* Photo Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Photo</label>
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                            Edit
                        </button>
                    </div>
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                    </div>
                </div>

                {/* Name Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                            Edit
                        </button>
                    </div>
                    <p className="text-sm text-gray-900">{user?.name || "Not set"}</p>
                </div>

                {/* Email Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Email address</label>
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                            Edit
                        </button>
                    </div>
                    <p className="text-sm text-gray-900">{user?.email || "Not set"}</p>
                </div>

                {/* Linked Team Account Section */}
                <div className="mb-8">
                    <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700">Linked team account</label>
                        <p className="text-xs text-gray-500 mt-1">
                            Easily switch between teams and access both team and any service.
                        </p>
                    </div>

                    {/* Account Cards */}
                    <div className="space-y-3">
                        {/* OpenVoid Account */}
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-600">OV</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">OpenVoid</span>
                            </div>
                            <button className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-md">
                                Manage team
                            </button>
                        </div>

                        {/* Simplias Ventures Account */}
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                    <span className="text-sm font-medium text-white">S</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">Simplias Ventures</span>
                            </div>
                            <button className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-md">
                                Manage team
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="border-t border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Preferences</h2>

                {/* Automatic Time Zone */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700">Automatic time zone</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">GMT +07:00</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Language */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Language</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>🇬🇧 English UK</option>
                        <option>🇺🇸 English US</option>
                        <option>🇪🇸 Spanish</option>
                        <option>🇫🇷 French</option>
                    </select>
                </div>

                {/* Date Format */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Date format</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

// Security Tab Component (Change Password)
const SecurityTab = () => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [formError, setFormError] = useState("");
    const { changePassword, clearError, error, isLoading } = useAuthStore();

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
            // Clear form on success
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch (error: any) {
            console.error(error);
            if (error?.response && error.response.status === 400) {
                setFormError("Current password is incorrect");
            } else {
                setFormError(error?.message || "Error changing password. Please try again.");
            }
        }
    };

    return (
        <div className="mac-card p-6">
            <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Change Password</h2>
                <p className="text-sm text-gray-500 mb-6">Update your account password</p>

                {(formError || error) && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                        {formError || error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
                            className={`px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isLoading
                                ? 'bg-blue-400'
                                : 'bg-blue-600 hover:bg-blue-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        </div>
    );
};

// Placeholder Tab Component
const PlaceholderTab: React.FC<PlaceholderTabProps> = ({ title }) => {
    return (
        <div className="mac-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
            <p className="text-sm text-gray-500">This section is coming soon...</p>
        </div>
    );
};
// Gemini Tab Component
const GeminiTab = () => {
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            console.log("Saving API Key");

            const response = await axios.post(`${API_URL}/gemini/key`, { apiKey }, { withCredentials: true });

            if (response.data.success) {
                toast.success("Gemini API Key saved successfully");
                setApiKey("");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save API Key");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mac-card p-6">
            <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Gemini API Configuration</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Configure your Google Gemini API key to enable AI-powered test case generation.
                    Your key is encrypted before being stored.
                </p>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                            API Key
                        </label>
                        <div className="relative">
                            <Input
                                id="apiKey"
                                icon={Lock}
                                type="password"
                                placeholder="Enter your Gemini API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            You can generate an API key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
                        </p>
                    </div>

                    <div className="pt-2">
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={isLoading}
                            className={`px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isLoading
                                ? 'bg-blue-400'
                                : 'bg-blue-600 hover:bg-blue-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                            {isLoading ? 'Saving...' : 'Save API Key'}
                        </motion.button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
