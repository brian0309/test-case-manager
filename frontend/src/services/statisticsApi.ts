import axios from 'axios';
import { API_URL } from '../utils/api';
import { TicketStatus } from '../types/testManager';
import { TestRunStatus } from '../types/testManager';

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
        testCaseId: string;
    }[];
}

export interface StatusCountItem<T extends string> {
    status: T;
    count: number;
}

export interface ProjectDashboardStats {
    projectId: string;
    projectName: string;
    ticketsByStatus: StatusCountItem<TicketStatus>[];
    runsByStatus: StatusCountItem<TestRunStatus>[];
    suitesCount: number;
    casesCount: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await axios.get(`${API_URL}/statistics`, {
        withCredentials: true,
    });
    return response.data;
};

export const getProjectDashboardStats = async (projectId: string): Promise<ProjectDashboardStats> => {
    const response = await axios.get(`${API_URL}/statistics/project/${projectId}`, {
        withCredentials: true,
    });
    return response.data;
};
