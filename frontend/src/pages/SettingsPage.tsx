import React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import Input from "../components/Input";
import { Lock, Moon, Sun } from "lucide-react";
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

type AIProvider = 'gemini' | 'openrouter';

interface ProviderModelOption {
    value: string;
    label: string;
    description?: string;
    source?: 'api' | 'fallback' | 'custom';
}

interface GeminiSettingsData {
    hasApiKey: boolean;
    model: string;
    availableModels: ProviderModelOption[];
    visibleModels: string[];
    preferredProvider: AIProvider;
}

interface OpenRouterSettingsData {
    hasApiKey: boolean;
    model: string;
    availableModels: ProviderModelOption[];
    visibleModels: string[];
    customModels: string[];
    preferredProvider: AIProvider;
}

const parseCustomModelsInput = (value: string): string[] => {
    const unique = new Set<string>();
    value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .forEach((item) => unique.add(item));

    return Array.from(unique);
};

const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("general");
    const { user } = useAuthStore();

    const tabs: Tab[] = [
        { id: "general", label: "General" },
        { id: "security", label: "Security" },
        { id: "gemini", label: "AI Providers" },
    ];

    return (
        <div className="bg-white dark:bg-gray-900 min-h-full p-4 sm:p-6 space-y-6">
            <div className="space-y-6">
                <div className="px-2 lg:px-0">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {user?.name || "User"}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                            Manage your preferences here.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex space-x-8 overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                        ? "border-system-blue text-system-blue dark:text-system-darkBlue"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600"
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
                </motion.div>
            </div>
        </div>
    );
};

// General Tab Component
const GeneralTab: React.FC<GeneralTabProps> = ({ user }) => {
    const { isDarkMode, toggleTheme } = useThemeStore();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Basics</h2>

                {/* Photo Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Photo</label>
                        <button className="text-sm text-system-blue hover:text-system-darkBlue dark:text-system-darkBlue">
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
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                        <button className="text-sm text-system-blue hover:text-system-darkBlue dark:text-system-darkBlue">
                            Edit
                        </button>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{user?.name || "Not set"}</p>
                </div>

                {/* Email Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
                        <button className="text-sm text-system-blue hover:text-system-darkBlue dark:text-system-darkBlue">
                            Edit
                        </button>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{user?.email || "Not set"}</p>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="border-t border-gray-100 p-6 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Preferences</h2>

                {/* Dark Mode Toggle */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => !isDarkMode && toggleTheme()}
                                className={`p-2 rounded-lg transition-colors ${!isDarkMode ? 'bg-system-blue/10 text-system-blue' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                title="Light mode"
                            >
                                <Sun size={20} />
                            </button>
                            <button
                                onClick={() => isDarkMode && toggleTheme()}
                                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-system-blue/10 text-system-blue dark:text-system-darkBlue' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                title="Dark mode"
                            >
                                <Moon size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Automatic Time Zone */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Automatic time zone</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">GMT +07:00</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-system-blue"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Language */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Language</label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        <option>🇬🇧 English UK</option>
                        <option>🇺🇸 English US</option>
                        <option>🇪🇸 Spanish</option>
                        <option>🇫🇷 French</option>
                    </select>
                </div>

                {/* Date Format */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Date format</label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
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
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { status?: number }; message?: string };
            if (axiosError?.response && axiosError.response.status === 400) {
                setFormError("Current password is incorrect");
            } else {
                setFormError(axiosError?.message || "Error changing password. Please try again.");
            }
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-6">
            <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Change Password</h2>
                <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">Update your account password</p>

                {(formError || error) && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-md">
                        {formError || error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                ? 'bg-gray-400 dark:bg-gray-600'
                                : 'bg-system-blue hover:bg-system-darkBlue'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-system-blue`}
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

// AI Providers Tab Component
const GeminiTab = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    const [preferredProvider, setPreferredProvider] = useState<AIProvider>('gemini');

    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [geminiHasExistingKey, setGeminiHasExistingKey] = useState(false);
    const [geminiSelectedModel, setGeminiSelectedModel] = useState('gemini-2.5-flash');
    const [geminiAvailableModels, setGeminiAvailableModels] = useState<ProviderModelOption[]>([]);
    const [geminiVisibleModels, setGeminiVisibleModels] = useState<string[]>([]);

    const [openRouterApiKey, setOpenRouterApiKey] = useState('');
    const [openRouterHasExistingKey, setOpenRouterHasExistingKey] = useState(false);
    const [openRouterSelectedModel, setOpenRouterSelectedModel] = useState('openai/gpt-4o-mini');
    const [openRouterAvailableModels, setOpenRouterAvailableModels] = useState<ProviderModelOption[]>([]);
    const [openRouterVisibleModels, setOpenRouterVisibleModels] = useState<string[]>([]);
    const [openRouterCustomModelsInput, setOpenRouterCustomModelsInput] = useState('');
    const [openRouterModelSearch, setOpenRouterModelSearch] = useState('');

    const resolveVisibleModelIds = (availableModels: ProviderModelOption[], visibleModels: string[]): string[] => {
        const availableSet = new Set(availableModels.map((model) => model.value));
        const filtered = visibleModels.filter((modelId) => availableSet.has(modelId));
        if (filtered.length > 0) {
            return filtered;
        }

        return availableModels.slice(0, 8).map((model) => model.value);
    };

    const getSelectableModels = (availableModels: ProviderModelOption[], visibleModels: string[]): ProviderModelOption[] => {
        if (availableModels.length === 0) {
            return [];
        }

        if (visibleModels.length === 0) {
            return availableModels;
        }

        const visibleSet = new Set(visibleModels);
        const filtered = availableModels.filter((model) => visibleSet.has(model.value));
        return filtered.length > 0 ? filtered : availableModels;
    };

    const fetchSettings = React.useCallback(async () => {
        setIsBootstrapping(true);
        try {
            const [geminiResponse, openRouterResponse] = await Promise.all([
                axios.get(`${API_URL}/gemini/settings`, { withCredentials: true }),
                axios.get(`${API_URL}/openrouter/settings`, { withCredentials: true }),
            ]);

            if (geminiResponse.data?.success) {
                const geminiData = geminiResponse.data.data as GeminiSettingsData;
                const available = Array.isArray(geminiData.availableModels) ? geminiData.availableModels : [];
                const visible = resolveVisibleModelIds(available, geminiData.visibleModels || []);
                const selectable = getSelectableModels(available, visible);

                setGeminiHasExistingKey(Boolean(geminiData.hasApiKey));
                setGeminiAvailableModels(available);
                setGeminiVisibleModels(visible);
                setGeminiSelectedModel(
                    selectable.some((model) => model.value === geminiData.model)
                        ? geminiData.model
                        : selectable[0]?.value || 'gemini-2.5-flash'
                );
                setPreferredProvider(geminiData.preferredProvider || 'gemini');
            }

            if (openRouterResponse.data?.success) {
                const openRouterData = openRouterResponse.data.data as OpenRouterSettingsData;
                const available = Array.isArray(openRouterData.availableModels) ? openRouterData.availableModels : [];
                const visible = resolveVisibleModelIds(available, openRouterData.visibleModels || []);
                const selectable = getSelectableModels(available, visible);

                setOpenRouterHasExistingKey(Boolean(openRouterData.hasApiKey));
                setOpenRouterAvailableModels(available);
                setOpenRouterVisibleModels(visible);
                setOpenRouterSelectedModel(
                    selectable.some((model) => model.value === openRouterData.model)
                        ? openRouterData.model
                        : selectable[0]?.value || 'openai/gpt-4o-mini'
                );
                setOpenRouterCustomModelsInput((openRouterData.customModels || []).join('\n'));
                if (!geminiResponse.data?.success) {
                    setPreferredProvider(openRouterData.preferredProvider || 'gemini');
                }
            }
        } catch (error) {
            console.error('Error fetching AI provider settings:', error);
            toast.error('Failed to load AI provider settings');
        } finally {
            setIsBootstrapping(false);
        }
    }, []);

    React.useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const toggleVisibleModel = (
        provider: AIProvider,
        modelId: string
    ) => {
        if (provider === 'gemini') {
            setGeminiVisibleModels((previous) => {
                const exists = previous.includes(modelId);
                if (exists && previous.length === 1) {
                    toast.error('At least one Gemini model must remain visible');
                    return previous;
                }

                return exists
                    ? previous.filter((id) => id !== modelId)
                    : [...previous, modelId];
            });
            return;
        }

        setOpenRouterVisibleModels((previous) => {
            const exists = previous.includes(modelId);
            if (exists && previous.length === 1) {
                toast.error('At least one OpenRouter model must remain visible');
                return previous;
            }

            return exists
                ? previous.filter((id) => id !== modelId)
                : [...previous, modelId];
        });
    };

    const handleSaveProviderPreference = async () => {
        setIsLoading(true);
        try {
            await axios.post(
                `${API_URL}/gemini/key`,
                { preferredProvider },
                { withCredentials: true }
            );
            toast.success('Preferred AI provider updated');
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to save preferred provider');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveGeminiSettings = async () => {
        if (!geminiHasExistingKey && !geminiApiKey.trim()) {
            toast.error('Please enter your Gemini API key');
            return;
        }

        if (!geminiSelectedModel) {
            toast.error('Please select a Gemini model');
            return;
        }

        if (geminiVisibleModels.length === 0) {
            toast.error('At least one Gemini model must be visible');
            return;
        }

        setIsLoading(true);
        try {
            const payload: {
                model: string;
                visibleModels: string[];
                preferredProvider: AIProvider;
                apiKey?: string;
            } = {
                model: geminiSelectedModel,
                visibleModels: geminiVisibleModels,
                preferredProvider,
            };

            if (geminiApiKey.trim()) {
                payload.apiKey = geminiApiKey.trim();
            }

            await axios.post(`${API_URL}/gemini/key`, payload, { withCredentials: true });
            toast.success('Gemini settings saved successfully');
            setGeminiApiKey('');
            setGeminiHasExistingKey(true);
            await fetchSettings();
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to save Gemini settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveOpenRouterSettings = async () => {
        if (!openRouterHasExistingKey && !openRouterApiKey.trim()) {
            toast.error('Please enter your OpenRouter API key');
            return;
        }

        if (!openRouterSelectedModel) {
            toast.error('Please select an OpenRouter model');
            return;
        }

        if (openRouterVisibleModels.length === 0) {
            toast.error('At least one OpenRouter model must be visible');
            return;
        }

        const customModels = parseCustomModelsInput(openRouterCustomModelsInput);

        setIsLoading(true);
        try {
            const payload: {
                model: string;
                visibleModels: string[];
                customModels: string[];
                preferredProvider: AIProvider;
                apiKey?: string;
            } = {
                model: openRouterSelectedModel,
                visibleModels: openRouterVisibleModels,
                customModels,
                preferredProvider,
            };

            if (openRouterApiKey.trim()) {
                payload.apiKey = openRouterApiKey.trim();
            }

            await axios.post(`${API_URL}/openrouter/key`, payload, { withCredentials: true });
            toast.success('OpenRouter settings saved successfully');
            setOpenRouterApiKey('');
            setOpenRouterHasExistingKey(true);
            await fetchSettings();
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to save OpenRouter settings');
        } finally {
            setIsLoading(false);
        }
    };

    const geminiSelectableModels = getSelectableModels(geminiAvailableModels, geminiVisibleModels);
    const openRouterSelectableModels = getSelectableModels(openRouterAvailableModels, openRouterVisibleModels);
    const filteredOpenRouterModels = openRouterAvailableModels.filter((model) => {
        const query = openRouterModelSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return (
            model.label.toLowerCase().includes(query)
            || model.value.toLowerCase().includes(query)
            || (model.description || '').toLowerCase().includes(query)
        );
    });

    React.useEffect(() => {
        if (geminiSelectableModels.length === 0) {
            return;
        }

        if (!geminiSelectableModels.some((model) => model.value === geminiSelectedModel)) {
            setGeminiSelectedModel(geminiSelectableModels[0].value);
        }
    }, [geminiSelectableModels, geminiSelectedModel]);

    React.useEffect(() => {
        if (openRouterSelectableModels.length === 0) {
            return;
        }

        if (!openRouterSelectableModels.some((model) => model.value === openRouterSelectedModel)) {
            setOpenRouterSelectedModel(openRouterSelectableModels[0].value);
        }
    }, [openRouterSelectableModels, openRouterSelectedModel]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-6">
            <div className="max-w-3xl space-y-8">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">AI Provider Configuration</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Configure Gemini and OpenRouter keys, control visible models, and set your default provider for generation.
                    </p>
                </div>

                {isBootstrapping ? (
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                        Loading AI provider settings...
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Default Generation Provider</h3>
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                <select
                                    value={preferredProvider}
                                    onChange={(event) => setPreferredProvider(event.target.value as AIProvider)}
                                    className="w-full sm:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="gemini">Gemini</option>
                                    <option value="openrouter">OpenRouter</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleSaveProviderPreference}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-medium rounded-md bg-system-blue hover:bg-system-darkBlue text-white disabled:opacity-60"
                                >
                                    Save Preference
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Gemini</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Configure your Google AI Studio key and control which Gemini models appear in selectors.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Gemini API Key {geminiHasExistingKey ? '(Optional - Update)' : ''}
                                </label>
                                <Input
                                    id="geminiApiKey"
                                    icon={Lock}
                                    type="password"
                                    placeholder={geminiHasExistingKey ? 'Leave blank to keep current key' : 'Enter your Gemini API key'}
                                    value={geminiApiKey}
                                    onChange={(event) => setGeminiApiKey(event.target.value)}
                                    required={!geminiHasExistingKey}
                                    className="w-full"
                                />
                                {!geminiHasExistingKey && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Generate a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-system-blue hover:text-system-darkBlue dark:text-system-darkBlue">Google AI Studio</a>.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Gemini Model</label>
                                <select
                                    value={geminiSelectedModel}
                                    onChange={(event) => setGeminiSelectedModel(event.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                    {geminiSelectableModels.map((model) => (
                                        <option key={model.value} value={model.value}>{model.label}</option>
                                    ))}
                                </select>
                                {geminiSelectableModels.find((model) => model.value === geminiSelectedModel)?.description && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {geminiSelectableModels.find((model) => model.value === geminiSelectedModel)?.description}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visible Gemini Models</label>
                                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-2">
                                    {geminiAvailableModels.map((model) => (
                                        <label key={model.value} className="flex items-start gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={geminiVisibleModels.includes(model.value)}
                                                onChange={() => toggleVisibleModel('gemini', model.value)}
                                                className="mt-0.5 h-4 w-4 text-system-blue rounded border-gray-300 dark:border-gray-600 focus:ring-system-blue dark:bg-gray-700"
                                            />
                                            <div>
                                                <p className="text-sm text-gray-900 dark:text-gray-100">{model.label}</p>
                                                {model.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{model.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={handleSaveGeminiSettings}
                                    disabled={isLoading}
                                    className="px-5 py-2.5 text-sm font-medium rounded-md bg-system-blue hover:bg-system-darkBlue text-white disabled:opacity-60"
                                >
                                    Save Gemini Settings
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">OpenRouter</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Configure your OpenRouter key, add custom model IDs, and control visible models for selectors.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    OpenRouter API Key {openRouterHasExistingKey ? '(Optional - Update)' : ''}
                                </label>
                                <Input
                                    id="openRouterApiKey"
                                    icon={Lock}
                                    type="password"
                                    placeholder={openRouterHasExistingKey ? 'Leave blank to keep current key' : 'Enter your OpenRouter API key'}
                                    value={openRouterApiKey}
                                    onChange={(event) => setOpenRouterApiKey(event.target.value)}
                                    required={!openRouterHasExistingKey}
                                    className="w-full"
                                />
                                {!openRouterHasExistingKey && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Generate a key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-system-blue hover:text-system-darkBlue dark:text-system-darkBlue">OpenRouter</a>.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom OpenRouter Model IDs</label>
                                <textarea
                                    value={openRouterCustomModelsInput}
                                    onChange={(event) => setOpenRouterCustomModelsInput(event.target.value)}
                                    rows={4}
                                    placeholder={'Add one model ID per line or comma-separated\nExample: anthropic/claude-3.5-sonnet'}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default OpenRouter Model</label>
                                <select
                                    value={openRouterSelectedModel}
                                    onChange={(event) => setOpenRouterSelectedModel(event.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                    {openRouterSelectableModels.map((model) => (
                                        <option key={model.value} value={model.value}>{model.label}</option>
                                    ))}
                                </select>
                                {openRouterSelectableModels.find((model) => model.value === openRouterSelectedModel)?.description && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {openRouterSelectableModels.find((model) => model.value === openRouterSelectedModel)?.description}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visible OpenRouter Models</label>
                                <input
                                    type="text"
                                    value={openRouterModelSearch}
                                    onChange={(event) => setOpenRouterModelSearch(event.target.value)}
                                    placeholder="Search models by name or ID"
                                    className="mb-3 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                                <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-2">
                                    {filteredOpenRouterModels.map((model) => (
                                        <label key={model.value} className="flex items-start gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={openRouterVisibleModels.includes(model.value)}
                                                onChange={() => toggleVisibleModel('openrouter', model.value)}
                                                className="mt-0.5 h-4 w-4 text-system-blue rounded border-gray-300 dark:border-gray-600 focus:ring-system-blue dark:bg-gray-700"
                                            />
                                            <div>
                                                <p className="text-sm text-gray-900 dark:text-gray-100">{model.label}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{model.value}</p>
                                                {model.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{model.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                    {filteredOpenRouterModels.length === 0 && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No models match your search.</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={handleSaveOpenRouterSettings}
                                    disabled={isLoading}
                                    className="px-5 py-2.5 text-sm font-medium rounded-md bg-system-blue hover:bg-system-darkBlue text-white disabled:opacity-60"
                                >
                                    Save OpenRouter Settings
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
