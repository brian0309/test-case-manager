import express from 'express';
import reportingController from '../controllers/reporting.controller.js';
import { verifyToken } from '../../../middleware/verifyToken.js';

const router = express.Router();

// All reporting routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/reports/project/:projectId/summary
 * @desc    Get project summary report with overall statistics
 * @access  Private
 * @query   startDate, endDate, suiteId, groupId, environment, tags, status
 */
router.get('/project/:projectId/summary', reportingController.getProjectSummary);

/**
 * @route   GET /api/reports/project/:projectId/trends
 * @desc    Get time-series trend data for test runs
 * @access  Private
 * @query   startDate, endDate, suiteId, groupId, environment, tags, groupBy (day|week|month)
 */
router.get('/project/:projectId/trends', reportingController.getTrendReport);

/**
 * @route   GET /api/reports/project/:projectId/suite-comparison
 * @desc    Get comparison of test suites with pass rates and trends
 * @access  Private
 * @query   startDate, endDate, environment, tags
 */
router.get('/project/:projectId/suite-comparison', reportingController.getSuiteComparison);

/**
 * @route   GET /api/reports/project/:projectId/test-case-health
 * @desc    Get test case health metrics (flaky tests, never executed, most failing)
 * @access  Private
 * @query   startDate, endDate, suiteId
 */
router.get('/project/:projectId/test-case-health', reportingController.getTestCaseHealth);

/**
 * @route   GET /api/reports/project/:projectId/ticket-metrics
 * @desc    Get ticket triage metrics (time-to-reproduce, % returned for missing context)
 * @access  Private
 * @query   startDate, endDate, failureType, team, status, severity, priority, groupBy
 */
router.get('/project/:projectId/ticket-metrics', reportingController.getTicketMetrics);

/**
 * @route   GET /api/reports/run/:runId/detailed
 * @desc    Get detailed report for a specific test run
 * @access  Private
 */
router.get('/run/:runId/detailed', reportingController.getDetailedRunReport);

export default router;
