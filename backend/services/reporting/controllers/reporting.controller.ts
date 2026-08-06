import { Request, Response } from 'express';
import reportingService from '../services/reporting.service.js';
import { ReportFilterParams, TrendReportParams, TicketMetricsFilterParams } from '../types/reporting.types.js';
import { FailureType } from '../../ticket/types/ticket.types.js';

/**
 * Reporting Controller
 * Handles HTTP requests for analytics and reporting endpoints
 */
export class ReportingController {
    /**
     * GET /api/reports/project/:projectId/summary
     * Get project summary report with overall statistics
     */
    async getProjectSummary(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params as Record<string, string>;
            const params: ReportFilterParams = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                suiteId: req.query.suiteId as string,
                groupId: req.query.groupId as string,
                environment: req.query.environment as string,
                tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
                status: req.query.status as any,
            };

            const report = await reportingService.getProjectSummary(projectId, params);
            res.status(200).json(report);
        } catch (error: any) {
            console.error('Error getting project summary:', error);
            res.status(500).json({ message: error.message || 'Failed to generate project summary report' });
        }
    }

    /**
     * GET /api/reports/project/:projectId/trends
     * Get time-series trend data for test runs
     */
    async getTrendReport(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params as Record<string, string>;
            const groupBy = (req.query.groupBy as 'day' | 'week' | 'month') || 'day';

            const params: TrendReportParams = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                suiteId: req.query.suiteId as string,
                groupId: req.query.groupId as string,
                environment: req.query.environment as string,
                tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
                status: req.query.status as any,
                groupBy,
            };

            const report = await reportingService.getTrendReport(projectId, params);
            res.status(200).json(report);
        } catch (error: any) {
            console.error('Error getting trend report:', error);
            res.status(500).json({ message: error.message || 'Failed to generate trend report' });
        }
    }

    /**
     * GET /api/reports/project/:projectId/suite-comparison
     * Get comparison of test suites with pass rates and trends
     */
    async getSuiteComparison(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params as Record<string, string>;
            const params: ReportFilterParams = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                environment: req.query.environment as string,
                tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
            };

            const report = await reportingService.getSuiteComparison(projectId, params);
            res.status(200).json(report);
        } catch (error: any) {
            console.error('Error getting suite comparison:', error);
            res.status(500).json({ message: error.message || 'Failed to generate suite comparison report' });
        }
    }

    /**
     * GET /api/reports/project/:projectId/test-case-health
     * Get test case health metrics (flaky tests, never executed, most failing)
     */
    async getTestCaseHealth(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params as Record<string, string>;
            const params: ReportFilterParams = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                suiteId: req.query.suiteId as string,
            };

            const report = await reportingService.getTestCaseHealth(projectId, params);
            res.status(200).json(report);
        } catch (error: any) {
            console.error('Error getting test case health:', error);
            res.status(500).json({ message: error.message || 'Failed to generate test case health report' });
        }
    }

    /**
     * GET /api/reports/project/:projectId/ticket-metrics
     * Get ticket triage metrics (time-to-reproduce, % returned for missing
     * context) segmented by failure type and team.
     * @query startDate, endDate, failureType, team, status, severity, priority, groupBy
     */
    async getTicketMetrics(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params as Record<string, string>;
            const rawFailureType = req.query.failureType as string;
            const params: TicketMetricsFilterParams = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                failureType: rawFailureType && Object.values(FailureType).includes(rawFailureType as FailureType)
                    ? rawFailureType as FailureType
                    : undefined,
                team: req.query.team as string,
                status: req.query.status as any,
                severity: req.query.severity as string,
                priority: req.query.priority as string,
                groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'day',
            };

            const report = await reportingService.getTicketMetrics(projectId, params);
            res.status(200).json(report);
        } catch (error: any) {
            console.error('Error getting ticket metrics:', error);
            res.status(500).json({ message: error.message || 'Failed to generate ticket metrics report' });
        }
    }

    /**
     * GET /api/reports/run/:runId/detailed
     * Get detailed report for a specific test run
     * @access  Private
     */
    async getDetailedRunReport(req: Request, res: Response): Promise<void> {
        try {
            const { runId } = req.params as Record<string, string>;
            const report = await reportingService.getDetailedRunReport(runId);
            res.status(200).json(report);
        } catch (error: any) {
            console.error('Error getting detailed run report:', error);
            res.status(500).json({ message: error.message || 'Failed to generate detailed run report' });
        }
    }
}

export default new ReportingController();
