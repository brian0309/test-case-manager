import axios from 'axios';
import { API_URL } from '../utils/api';

export interface DashboardStats {
    projectCount: number;
    totalSuites: number;
    suitesAddedToday: number;
    totalTestCases: number;
    testCasesModifiedToday: number;
    chartData: {
        name: string;
        value: number;
        fullDate: string;
    }[];
    recentActivity: {
        id: string;
        user: string;
        action: string;
        time: string;
        avatar: string;
    }[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await axios.get(`${API_URL}/statistics`, {
        withCredentials: true,
    });
    return response.data;
};
