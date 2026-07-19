import { TicketStatus, TicketPriority, TicketSeverity } from '../types/testManager';

// --- Status Colors (badge backgrounds) ---
export const getTicketStatusColor = (status: TicketStatus): string => {
    switch (status) {
        case TicketStatus.Open: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case TicketStatus.InProgress: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case TicketStatus.Resolved: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case TicketStatus.Closed: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        case TicketStatus.Reopened: return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
};

// --- Priority Colors (badge backgrounds) ---
export const getTicketPriorityColor = (priority: TicketPriority): string => {
    switch (priority) {
        case TicketPriority.Low: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        case TicketPriority.Medium: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case TicketPriority.High: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        case TicketPriority.Critical: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
};

// --- Severity Colors (badge backgrounds) ---
export const getTicketSeverityColor = (severity: TicketSeverity): string => {
    switch (severity) {
        case TicketSeverity.Trivial: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        case TicketSeverity.Minor: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case TicketSeverity.Major: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        case TicketSeverity.Critical: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case TicketSeverity.Blocker: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
};

// --- Text-only variants for table cells ---
export const getTicketPriorityTextColor = (priority: TicketPriority): string => {
    switch (priority) {
        case TicketPriority.Low: return 'text-gray-600 dark:text-gray-400';
        case TicketPriority.Medium: return 'text-blue-600 dark:text-blue-400';
        case TicketPriority.High: return 'text-orange-600 dark:text-orange-400';
        case TicketPriority.Critical: return 'text-red-600 dark:text-red-400';
        default: return 'text-gray-600 dark:text-gray-400';
    }
};

export const getTicketSeverityTextColor = (severity: TicketSeverity): string => {
    switch (severity) {
        case TicketSeverity.Trivial: return 'text-gray-400 dark:text-gray-500';
        case TicketSeverity.Minor: return 'text-blue-500 dark:text-blue-400';
        case TicketSeverity.Major: return 'text-orange-500 dark:text-orange-400';
        case TicketSeverity.Critical: return 'text-red-500 dark:text-red-400';
        case TicketSeverity.Blocker: return 'text-red-600 dark:text-red-400 font-bold';
        default: return 'text-gray-400 dark:text-gray-500';
    }
};

// --- Styled select variants (matching TestCaseModal's getStatusColor/getPriorityColor pattern) ---
export const getTicketStatusSelectColor = (status: TicketStatus): string => {
    switch (status) {
        case TicketStatus.Open: return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
        case TicketStatus.InProgress: return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
        case TicketStatus.Resolved: return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
        case TicketStatus.Closed: return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        case TicketStatus.Reopened: return 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800';
        default: return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
};

export const getTicketPrioritySelectColor = (priority: TicketPriority): string => {
    switch (priority) {
        case TicketPriority.Low: return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
        case TicketPriority.Medium: return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
        case TicketPriority.High: return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
        case TicketPriority.Critical: return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
        default: return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
};

export const getTicketSeveritySelectColor = (severity: TicketSeverity): string => {
    switch (severity) {
        case TicketSeverity.Trivial: return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        case TicketSeverity.Minor: return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
        case TicketSeverity.Major: return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
        case TicketSeverity.Critical: return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
        case TicketSeverity.Blocker: return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
        default: return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
};
