import React from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import Input from "../components/Input";
import { CheckCircle2, ChevronDown, Circle, Loader2, Lock, Moon, RefreshCw, Sun } from "lucide-react";
import toast from "react-hot-toast";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { User } from "../types";
import { API_URL } from "../utils/api";
import axios from "axios";
import ProviderLogo from "../components/ProviderLogo";
import { PROVIDER_BRANDS } from "../utils/providerBrands";
import type { AIProvider } from "../utils/providerBrands";

interface Tab {
    id: string;
    label: string;
}

interface GeneralTabProps {
    user: User | null;
}

interface ProviderModelOption {
    value: string;
    label: string;
    description?: string;
    source?: 'api' | 'fallback' | 'custom';
}

interface ProviderConfig {
    id: AIProvider;
    label: string;
    description: string;
    keyHintUrl: string;
    keyHintText: string;
    supportsCustomModels: boolean;
    defaultModel: string;
    endpointBase: string;
}

interface ProviderState {
    hasApiKey: boolean;
    apiKeyInput: string;
    selectedModel: string;
    availableModels: ProviderModelOption[];
    visibleModels: string[];
    customModelsInput: string;
    modelSearch: string;
    isExpanded: boolean;
    isSaving: boolean;
    isRefreshing: boolean;
}

interface ProviderSettingsData {
    hasApiKey: boolean;
    model: string;
    availableModels: ProviderModelOption[];
    visibleModels: string[];
    customModels?: string[];
    preferredProvider?: AIProvider;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
    {
        id: 'gemini',
        label: 'Gemini',
        description: 'Google AI Studio',
        keyHintUrl: 'https://aistudio.google.com/app/apikey',
        keyHintText: 'Google AI Studio',
        supportsCustomModels: false,
        defaultModel: 'gemini-2.5-flash',
        endpointBase: '/gemini',
    },
    {
        id: 'openrouter',
        label: 'OpenRouter',
        description: 'Access to many models through one key',
        keyHintUrl: 'https://openrouter.ai/keys',
        keyHintText: 'OpenRouter',
        supportsCustomModels: true,
        defaultModel: 'openai/gpt-4o-mini',
        endpointBase: '/openrouter',
    },
    {
        id: 'openai',
        label: 'OpenAI',
        description: 'GPT models',
        keyHintUrl: 'https://platform.openai.com/api-keys',
        keyHintText: 'OpenAI',
        supportsCustomModels: true,
        defaultModel: 'gpt-5',
        endpointBase: '/openai',
    },
    {
        id: 'anthropic',
        label: 'Anthropic Claude',
        description: 'Claude models',
        keyHintUrl: 'https://console.anthropic.com/settings/keys',
        keyHintText: 'Anthropic Console',
        supportsCustomModels: true,
        defaultModel: 'claude-sonnet-4',
        endpointBase: '/anthropic',
    },
    {
        id: 'deepseek',
        label: 'DeepSeek',
        description: 'DeepSeek V4 models',
        keyHintUrl: 'https://platform.deepseek.com/api_keys',
        keyHintText: 'DeepSeek Platform',
        supportsCustomModels: true,
        defaultModel: 'deepseek-v4-flash',
        endpointBase: '/deepseek',
    },
];

const getProviderConfig = (provider: AIProvider): ProviderConfig => {
    return PROVIDER_CONFIGS.find((config) => config.id === provider) || PROVIDER_CONFIGS[0];
};

const createInitialProviderStates = (): Record<AIProvider, ProviderState> => {
    return PROVIDER_CONFIGS.reduce((acc, config) => {
        acc[config.id] = {
            hasApiKey: false,
            apiKeyInput: '',
            selectedModel: config.defaultModel,
            availableModels: [],
            visibleModels: [],
            customModelsInput: '',
            modelSearch: '',
            isExpanded: false,
            isSaving: false,
            isRefreshing: false,
        };
        return acc;
    }, {} as Record<AIProvider, ProviderState>);
};

const parseCustomModelsInput = (value: string): string[] => {
    const unique = new Set<string>();
    value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .forEach((item) => unique.add(item));

    return Array.from(unique);
};

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

const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("general");
    const { user } = useAuthStore();

    const tabs: Tab[] = [
        { id: "general", label: "General" },
        { id: "security", label: "Security" },
        { id: "ai-providers", label: "AI Providers" },
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
                    {activeTab === "ai-providers" && <AiProvidersTab />}
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
const AiProvidersTab = () => {
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [preferredProvider, setPreferredProvider] = useState<AIProvider>('gemini');
    const [isSettingDefault, setIsSettingDefault] = useState<AIProvider | null>(null);
    const [providerStates, setProviderStates] = useState<Record<AIProvider, ProviderState>>(createInitialProviderStates);

    const patchProvider = (provider: AIProvider, patch: Partial<ProviderState>) => {
        setProviderStates((previous) => ({
            ...previous,
            [provider]: { ...previous[provider], ...patch },
        }));
    };

    const applySettingsData = (provider: AIProvider, data: ProviderSettingsData) => {
        const config = getProviderConfig(provider);
        const available = Array.isArray(data.availableModels) ? data.availableModels : [];
        const visible = resolveVisibleModelIds(available, data.visibleModels || []);
        const selectable = getSelectableModels(available, visible);
        const selectedModel = selectable.some((model) => model.value === data.model)
            ? data.model
            : selectable[0]?.value || config.defaultModel;

        patchProvider(provider, {
            hasApiKey: Boolean(data.hasApiKey),
            availableModels: available,
            visibleModels: visible,
            selectedModel,
            customModelsInput: (data.customModels || []).join('\n'),
        });
    };

    const fetchSettings = React.useCallback(async () => {
        setIsBootstrapping(true);
        try {
            const responses = await Promise.all(
                PROVIDER_CONFIGS.map(async (config) => {
                    try {
                        const response = await axios.get(`${API_URL}${config.endpointBase}/settings`, { withCredentials: true });
                        if (response.data?.success) {
                            return { provider: config.id, data: response.data.data as ProviderSettingsData };
                        }
                    } catch (error) {
                        console.error(`Error fetching ${config.label} settings:`, error);
                    }
                    return { provider: config.id, data: null };
                })
            );

            responses.forEach(({ provider, data }) => {
                if (data) {
                    applySettingsData(provider, data);
                }
            });

            const firstConfigured = responses.find(({ data }) => data?.preferredProvider);
            if (firstConfigured?.data?.preferredProvider) {
                setPreferredProvider(firstConfigured.data.preferredProvider);
            }
        } catch (error) {
            console.error('Error fetching AI provider settings:', error);
            toast.error('Failed to load AI provider settings');
        } finally {
            setIsBootstrapping(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    React.useEffect(() => {
        PROVIDER_CONFIGS.forEach((config) => {
            const state = providerStates[config.id];
            const selectable = getSelectableModels(state.availableModels, state.visibleModels);
            if (selectable.length === 0) {
                return;
            }

            if (!selectable.some((model) => model.value === state.selectedModel)) {
                patchProvider(config.id, { selectedModel: selectable[0].value });
            }
        });
    }, [providerStates]);

    const toggleVisibleModel = (provider: AIProvider, modelId: string) => {
        const state = providerStates[provider];
        const config = getProviderConfig(provider);
        const exists = state.visibleModels.includes(modelId);
        if (exists && state.visibleModels.length === 1) {
            toast.error(`At least one ${config.label} model must remain visible`);
            return;
        }

        patchProvider(provider, {
            visibleModels: exists
                ? state.visibleModels.filter((id) => id !== modelId)
                : [...state.visibleModels, modelId],
        });
    };

    const handleSetDefault = async (provider: AIProvider) => {
        const config = getProviderConfig(provider);

        if (!providerStates[provider].hasApiKey) {
            toast.error(`Configure ${config.label} first to set it as the default provider`);
            return;
        }

        setIsSettingDefault(provider);
        try {
            await axios.post(
                `${API_URL}/gemini/key`,
                { preferredProvider: provider },
                { withCredentials: true }
            );
            setPreferredProvider(provider);
            toast.success(`${config.label} is now your default generation provider`);
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to update preferred provider');
        } finally {
            setIsSettingDefault(null);
        }
    };

    const handleSaveProviderKey = async (provider: AIProvider) => {
        const config = getProviderConfig(provider);
        const state = providerStates[provider];

        if (!state.apiKeyInput.trim()) {
            toast.error(`Please enter your ${config.label} API key`);
            return;
        }

        patchProvider(provider, { isSaving: true });
        try {
            await axios.post(
                `${API_URL}${config.endpointBase}/key`,
                { apiKey: state.apiKeyInput.trim() },
                { withCredentials: true }
            );
            toast.success(`${config.label} added successfully`);
            patchProvider(provider, { apiKeyInput: '', hasApiKey: true });
            await fetchSettings();
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || `Failed to save ${config.label} API key`);
        } finally {
            patchProvider(provider, { isSaving: false });
        }
    };

    const handleSaveProviderSettings = async (provider: AIProvider) => {
        const config = getProviderConfig(provider);
        const state = providerStates[provider];

        if (!state.hasApiKey && !state.apiKeyInput.trim()) {
            toast.error(`Please enter your ${config.label} API key`);
            return;
        }

        if (!state.selectedModel) {
            toast.error(`Please select a ${config.label} model`);
            return;
        }

        if (state.visibleModels.length === 0) {
            toast.error(`At least one ${config.label} model must be visible`);
            return;
        }

        patchProvider(provider, { isSaving: true });
        try {
            const payload: {
                model: string;
                visibleModels: string[];
                preferredProvider: AIProvider;
                customModels?: string[];
                apiKey?: string;
            } = {
                model: state.selectedModel,
                visibleModels: state.visibleModels,
                preferredProvider,
            };

            if (config.supportsCustomModels) {
                payload.customModels = parseCustomModelsInput(state.customModelsInput);
            }

            if (state.apiKeyInput.trim()) {
                payload.apiKey = state.apiKeyInput.trim();
            }

            await axios.post(`${API_URL}${config.endpointBase}/key`, payload, { withCredentials: true });
            toast.success(`${config.label} settings saved successfully`);
            patchProvider(provider, { apiKeyInput: '', hasApiKey: true });
            await fetchSettings();
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || `Failed to save ${config.label} settings`);
        } finally {
            patchProvider(provider, { isSaving: false });
        }
    };

    const handleRefreshModels = async (provider: AIProvider) => {
        const config = getProviderConfig(provider);

        patchProvider(provider, { isRefreshing: true });
        try {
            const response = await axios.get(`${API_URL}${config.endpointBase}/settings?refresh=1`, { withCredentials: true });
            if (response.data?.success) {
                applySettingsData(provider, response.data.data as ProviderSettingsData);
                toast.success(`${config.label} models refreshed`);
            }
        } catch (error: unknown) {
            console.error(error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || `Failed to refresh ${config.label} models`);
        } finally {
            patchProvider(provider, { isRefreshing: false });
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-6">
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">AI Provider Configuration</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add a provider API key, pick the models you want to use for generation, then set your default provider.
                    </p>
                </div>

                {isBootstrapping ? (
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                        Loading AI provider settings...
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30 p-4">
                            <span className="flex items-center gap-2.5">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Default provider</span>
                                <ProviderLogo provider={preferredProvider} size="sm" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {getProviderConfig(preferredProvider).label}
                                </span>
                            </span>
                            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                                {PROVIDER_CONFIGS.filter((config) => providerStates[config.id].hasApiKey).length} of {PROVIDER_CONFIGS.length} configured
                            </span>
                        </div>

                        <div className="space-y-4">
                            {PROVIDER_CONFIGS.map((config) => (
                                <ProviderCard
                                    key={config.id}
                                    config={config}
                                    state={providerStates[config.id]}
                                    isPreferred={preferredProvider === config.id}
                                    isSettingDefault={isSettingDefault === config.id}
                                    onToggleExpand={() => patchProvider(config.id, { isExpanded: !providerStates[config.id].isExpanded })}
                                    onToggleVisibleModel={(modelId) => toggleVisibleModel(config.id, modelId)}
                                    onSetDefault={() => handleSetDefault(config.id)}
                                    onSaveKey={() => handleSaveProviderKey(config.id)}
                                    onSaveSettings={() => handleSaveProviderSettings(config.id)}
                                    onRefreshModels={() => handleRefreshModels(config.id)}
                                    onPatch={patchProvider}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

interface ProviderCardProps {
    config: ProviderConfig;
    state: ProviderState;
    isPreferred: boolean;
    isSettingDefault: boolean;
    onToggleExpand: () => void;
    onToggleVisibleModel: (modelId: string) => void;
    onSetDefault: () => void;
    onSaveKey: () => void;
    onSaveSettings: () => void;
    onRefreshModels: () => void;
    onPatch: (provider: AIProvider, patch: Partial<ProviderState>) => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
    config,
    state,
    isPreferred,
    isSettingDefault,
    onToggleExpand,
    onToggleVisibleModel,
    onSetDefault,
    onSaveKey,
    onSaveSettings,
    onRefreshModels,
    onPatch,
}) => {
    const selectableModels = getSelectableModels(state.availableModels, state.visibleModels);
    const searchQuery = state.modelSearch.trim().toLowerCase();
    const filteredModels = searchQuery
        ? state.availableModels.filter((model) =>
            model.label.toLowerCase().includes(searchQuery)
            || model.value.toLowerCase().includes(searchQuery)
            || (model.description || '').toLowerCase().includes(searchQuery)
        )
        : state.availableModels;

    const selectedModelDescription = selectableModels.find((model) => model.value === state.selectedModel)?.description;
    const brand = PROVIDER_BRANDS[config.id];

    return (
        <div
            className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 transition-all ${state.isExpanded ? 'border-l-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none' : ''}`}
            style={state.isExpanded ? { borderLeftColor: brand.color } : undefined}
        >
            <button
                type="button"
                onClick={onToggleExpand}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <ProviderLogo provider={config.id} size="md" />
                    <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{config.label}</h3>
                            {isPreferred && (
                                <span
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                                    style={{ backgroundColor: `${brand.color}1A`, color: brand.color }}
                                >
                                    Default
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {config.description}
                            <span className="text-gray-400 dark:text-gray-500"> · </span>
                            {state.hasApiKey
                                ? `${state.visibleModels.length} visible model${state.visibleModels.length === 1 ? '' : 's'}`
                                : 'No API key yet'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 ml-3 shrink-0">
                    <span
                        className={`flex items-center space-x-1 text-xs font-medium ${state.hasApiKey
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-400 dark:text-gray-500'
                            }`}
                    >
                        {state.hasApiKey ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        <span>{state.hasApiKey ? 'Configured' : 'Not configured'}</span>
                    </span>
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${state.isExpanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            <AnimatePresence initial={false}>
                {state.isExpanded && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {config.label} API Key {state.hasApiKey ? '(Optional - Update)' : ''}
                                </label>
                                <Input
                                    id={`${config.id}ApiKey`}
                                    icon={Lock}
                                    type="password"
                                    placeholder={state.hasApiKey ? 'Leave blank to keep current key' : `Enter your ${config.label} API key`}
                                    value={state.apiKeyInput}
                                    onChange={(event) => onPatch(config.id, { apiKeyInput: event.target.value })}
                                    required={!state.hasApiKey}
                                    className="w-full"
                                />
                                {!state.hasApiKey && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Get a key from <a href={config.keyHintUrl} target="_blank" rel="noopener noreferrer" className="text-system-blue hover:text-system-darkBlue dark:text-system-darkBlue">{config.keyHintText}</a>.
                                    </p>
                                )}
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={onSetDefault}
                                    disabled={!state.hasApiKey || isPreferred || isSettingDefault}
                                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isPreferred ? '' : 'border-gray-300 dark:border-gray-600'}`}
                                            style={isPreferred ? { borderColor: brand.color } : undefined}
                                        >
                                            {isPreferred && (
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brand.color }} />
                                            )}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Use as default generation provider
                                        </span>
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                        {isSettingDefault ? (
                                            <span className="flex items-center gap-1">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                                            </span>
                                        ) : isPreferred ? (
                                            'Current default'
                                        ) : !state.hasApiKey ? (
                                            'Requires API key'
                                        ) : (
                                            'Set default'
                                        )}
                                    </span>
                                </button>
                            </div>

                            {!state.hasApiKey ? (
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={onSaveKey}
                                        disabled={state.isSaving}
                                        className="px-5 py-2.5 text-sm font-medium rounded-md bg-system-blue hover:bg-system-darkBlue text-white disabled:opacity-60"
                                    >
                                        {state.isSaving ? 'Saving...' : 'Save & Continue'}
                                    </button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Model selection unlocks after you save your API key.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {config.supportsCustomModels && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Custom {config.label} Model IDs
                                            </label>
                                            <textarea
                                                value={state.customModelsInput}
                                                onChange={(event) => onPatch(config.id, { customModelsInput: event.target.value })}
                                                rows={3}
                                                placeholder={'Add one model ID per line or comma-separated\nExample: claude-sonnet-4'}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Default {config.label} Model
                                        </label>
                                        <select
                                            value={state.selectedModel}
                                            onChange={(event) => onPatch(config.id, { selectedModel: event.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        >
                                            {selectableModels.map((model) => (
                                                <option key={model.value} value={model.value}>{model.label}</option>
                                            ))}
                                        </select>
                                        {selectedModelDescription && (
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{selectedModelDescription}</p>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Visible {config.label} Models
                                            </label>
                                            <button
                                                type="button"
                                                onClick={onRefreshModels}
                                                disabled={state.isRefreshing}
                                                className="flex items-center space-x-1 text-xs font-medium text-system-blue hover:text-system-darkBlue dark:text-system-darkBlue disabled:opacity-60"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${state.isRefreshing ? 'animate-spin' : ''}`} />
                                                <span>{state.isRefreshing ? 'Refreshing...' : 'Refresh models'}</span>
                                            </button>
                                        </div>
                                        {state.availableModels.length > 6 && (
                                            <input
                                                type="text"
                                                value={state.modelSearch}
                                                onChange={(event) => onPatch(config.id, { modelSearch: event.target.value })}
                                                placeholder="Search models by name or ID"
                                                className="mb-3 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-system-blue bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                        )}
                                        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-2">
                                            {filteredModels.map((model) => (
                                                <label key={model.value} className="flex items-start gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={state.visibleModels.includes(model.value)}
                                                        onChange={() => onToggleVisibleModel(model.value)}
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
                                            {filteredModels.length === 0 && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No models match your search.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="button"
                                            onClick={onSaveSettings}
                                            disabled={state.isSaving}
                                            className="px-5 py-2.5 text-sm font-medium rounded-md bg-system-blue hover:bg-system-darkBlue text-white disabled:opacity-60"
                                        >
                                            {state.isSaving ? 'Saving...' : `Save ${config.label} Settings`}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsPage;
