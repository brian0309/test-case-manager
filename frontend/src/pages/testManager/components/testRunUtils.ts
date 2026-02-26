import { TestRunStatus, RunItemStatus } from '../../../types/testManager';

export const getRunStatusColor = (status: TestRunStatus) => {
    switch (status) {
        case TestRunStatus.Draft:
            return 'bg-gray-100 text-gray-600 border-gray-200';
        case TestRunStatus.InProgress:
            return 'bg-blue-100 text-blue-600 border-blue-200';
        case TestRunStatus.Completed:
            return 'bg-green-100 text-green-600 border-green-200';
        case TestRunStatus.Abandoned:
            return 'bg-red-100 text-red-600 border-red-200';
        default:
            return 'bg-gray-100 text-gray-600 border-gray-200';
    }
};

export const getItemStatusColor = (status: RunItemStatus) => {
    switch (status) {
        case RunItemStatus.Passed:
            return 'bg-green-500';
        case RunItemStatus.Failed:
            return 'bg-red-500';
        case RunItemStatus.Blocked:
            return 'bg-orange-500';
        case RunItemStatus.Skipped:
            return 'bg-gray-400';
        case RunItemStatus.NotRun:
        default:
            return 'bg-gray-200';
    }
};

export const generateSuiteTitle = (suiteName: string) => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${suiteName} - ${month}-${day}-${year} ${hours}:${minutes}`;
};

export const getRunItemStatusBadgeColor = (status: RunItemStatus) => {
    switch (status) {
        case RunItemStatus.Passed:
            return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
        case RunItemStatus.Failed:
            return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700';
        case RunItemStatus.Blocked:
            return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700';
        case RunItemStatus.Skipped:
            return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-600';
        case RunItemStatus.NotRun:
        default:
            return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600';
    }
};

export const getPriorityColor = (priority?: string) => {
    switch (priority) {
        case 'Critical': return 'bg-red-500 dark:bg-red-500';
        case 'High': return 'bg-orange-500 dark:bg-orange-500';
        case 'Medium': return 'bg-yellow-400 dark:bg-yellow-500';
        case 'Low': return 'bg-blue-400 dark:bg-blue-500';
        default: return 'bg-gray-400 dark:bg-gray-500';
    }
};
