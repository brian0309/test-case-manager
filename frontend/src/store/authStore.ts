import { create } from "zustand";
import axios, { AxiosError } from "axios";
import { AuthStoreState, User } from "../types";
import { API_URL } from "../utils/api";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

// Type for API error responses
interface ApiErrorResponse {
	message: string;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
	user: null,
	isAuthenticated: false,
	error: null,
	isLoading: false,
	isCheckingAuth: true,
	message: null,

	signup: async (email: string, password: string, name: string): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post<{ user: User }>(`${API_URL}/auth/signup`, { email, password, name });
			set({ user: response.data.user, isAuthenticated: true, isLoading: false });
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({ error: axiosError.response?.data?.message || "Error signing up", isLoading: false });
			throw error;
		}
	},

	login: async (email: string, password: string): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post<{ user: User }>(`${API_URL}/auth/login`, { email, password });
			set({
				isAuthenticated: true,
				user: response.data.user,
				error: null,
				isLoading: false,
			});
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({ error: axiosError.response?.data?.message || "Error logging in", isLoading: false });
			throw error;
		}
	},

	logout: async (): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			await axios.post(`${API_URL}/auth/logout`);
			set({ user: null, isAuthenticated: false, error: null, isLoading: false });
		} catch (error) {
			set({ error: "Error logging out", isLoading: false });
			throw error;
		}
	},

	// Google OAuth
	loginWithGoogle: async (): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.get<{ url: string }>(`${API_URL}/auth/google/url`);
			if (response.data.url) {
				window.location.href = response.data.url;
			}
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({ error: axiosError.response?.data?.message || "Error initiating Google login", isLoading: false });
			throw error;
		}
	},

	// Helper to set user after OAuth redirect
	setUser: (userData: User): void => {
		set({ 
			user: userData, 
			isAuthenticated: true, 
			isLoading: false, 
			error: null 
		});
	},

	verifyEmail: async (code: string): Promise<any> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post<{ user: User }>(`${API_URL}/auth/verify-email`, { code });
			set({ user: response.data.user, isAuthenticated: true, isLoading: false });
			return response.data;
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({ error: axiosError.response?.data?.message || "Error verifying email", isLoading: false });
			throw error;
		}
	},

	resendVerificationCode: async (): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post<{ message: string }>(`${API_URL}/auth/resend-verification-code`);
			set({ message: response.data.message, isLoading: false });
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({ error: axiosError.response?.data?.message || "Error resending verification code", isLoading: false });
			throw error;
		}
	},

	checkAuth: async (): Promise<void> => {
		set({ isCheckingAuth: true, error: null });
		try {
			const response = await axios.get<{ user: User }>(`${API_URL}/auth/check-auth`);
			set({ user: response.data.user, isAuthenticated: true, isCheckingAuth: false });
		} catch (error) {
			set({ error: null, isCheckingAuth: false, isAuthenticated: false });
		}
	},

	forgotPassword: async (email: string): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post<{ message: string }>(`${API_URL}/auth/forgot-password`, { email });
			set({ message: response.data.message, isLoading: false });
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({
				isLoading: false,
				error: axiosError.response?.data?.message || "Error sending reset password email",
			});
			throw error;
		}
	},

	resetPassword: async (token: string, password: string): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post<{ message: string }>(`${API_URL}/auth/reset-password/${token}`, { password });
			set({ message: response.data.message, isLoading: false });
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({
				isLoading: false,
				error: axiosError.response?.data?.message || "Error resetting password",
			});
			throw error;
		}
	},

	changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post<{ message: string }>(`${API_URL}/auth/change-password`, { currentPassword, newPassword });
			set({ message: response.data.message, isLoading: false });
		} catch (error) {
			const axiosError = error as AxiosError<ApiErrorResponse>;
			set({
				isLoading: false,
				error: axiosError.response?.data?.message || "Error changing password",
			});
			throw error;
		}
	},

	clearError: (): void => set({ error: null }),
}));
