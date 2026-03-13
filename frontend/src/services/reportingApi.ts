import axios from 'axios';
import { API_URL } from '../utils/api';
import {
    ProjectSummaryReport,
    TrendReport,
    SuiteComparisonReport,
    TestCaseHealthReport,
    DetailedRunReport,
    ReportFilterParams,
    TrendReportParams,
} from '../types/testManager';

/**
 * Reporting API Service
 * Handles all HTTP requests related to test run analytics and reporting
 */
class ReportingApi {
    private baseUrl = `${API_URL}/reports`;

    /**
     * Build query string from filter params
     */
    private buildQueryString(params: ReportFilterParams): string {
        const queryParams: string[] = [];

        if (params.startDate) queryParams.push(`startDate=${encodeURIComponent(params.startDate)}`);
        if (params.endDate) queryParams.push(`endDate=${encodeURIComponent(params.endDate)}`);
        if (params.suiteId) queryParams.push(`suiteId=${encodeURIComponent(params.suiteId)}`);
        if (params.groupId) queryParams.push(`groupId=${encodeURIComponent(params.groupId)}`);
        if (params.environment) queryParams.push(`environment=${encodeURIComponent(params.environment)}`);
        if (params.status) queryParams.push(`status=${encodeURIComponent(params.status)}`);
        if (params.tags && params.tags.length > 0) {
            queryParams.push(`tags=${params.tags.map(t => encodeURIComponent(t)).join(',')}`);
        }

        return queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    }

    /**
     * Get project summary report
     */
    async getProjectSummary(
        projectId: string,
        params: ReportFilterParams = {}
    ): Promise<ProjectSummaryReport> {
        const queryString = this.buildQueryString(params);
        const response = await axios.get(
            `${this.baseUrl}/project/${projectId}/summary${queryString}`,
            { withCredentials: true }
        );
        return response.data;
    }

    /**
     * Get trend report (time-series data)
     */
    async getTrendReport(
        projectId: string,
        params: TrendReportParams
    ): Promise<TrendReport> {
        const queryString = this.buildQueryString(params);
        const groupByParam = `groupBy=${encodeURIComponent(params.groupBy)}`;
        const separator = queryString ? '&' : '?';
        
        const response = await axios.get(
            `${this.baseUrl}/project/${projectId}/trends${queryString}${separator}${groupByParam}`,
            { withCredentials: true }
        );
        return response.data;
    }

    /**
     * Get suite comparison report
     */
    async getSuiteComparison(
        projectId: string,
        params: ReportFilterParams = {}
    ): Promise<SuiteComparisonReport> {
        const queryString = this.buildQueryString(params);
        const response = await axios.get(
            `${this.baseUrl}/project/${projectId}/suite-comparison${queryString}`,
            { withCredentials: true }
        );
        return response.data;
    }

    /**
     * Get test case health report
     */
    async getTestCaseHealth(
        projectId: string,
        params: ReportFilterParams = {}
    ): Promise<TestCaseHealthReport> {
        const queryString = this.buildQueryString(params);
        const response = await axios.get(
            `${this.baseUrl}/project/${projectId}/test-case-health${queryString}`,
            { withCredentials: true }
        );
        return response.data;
    }

    /**
     * Get detailed run report
     */
    async getDetailedRunReport(runId: string): Promise<DetailedRunReport> {
        const response = await axios.get(
            `${this.baseUrl}/run/${runId}/detailed`,
            { withCredentials: true }
        );
        return response.data;
    }

    /**
     * Export report data to CSV
     */
    async exportToCSV(reportType: string, _data: Record<string, unknown>): Promise<string> {
        // Delegate to client-side utility (exportReportToCSV in utils/exportReports.ts)
        // This method is kept for API compatibility; client-side export is preferred.
        return `CSV export for ${reportType} is handled client-side via exportReportToCSV utility.`;
    }

    /**
     * Export report data to PDF
     */
    async exportToPDF(reportType: string, _data: Record<string, unknown>): Promise<Blob> {
        // Delegate to client-side utility (exportReportToPDF in utils/exportReports.ts)
        // This method is kept for API compatibility; client-side export is preferred.
        const text = `PDF export for ${reportType} is handled client-side via exportReportToPDF utility.`;
        return new Blob([text], { type: 'text/plain' });
    }
}

export const reportingApi = new ReportingApi();
