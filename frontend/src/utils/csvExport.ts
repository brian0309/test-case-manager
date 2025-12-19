/**
 * CSV Export Utility
 * Provides functions to convert report data to CSV format and trigger downloads
 */

import {
    ProjectSummaryReport,
    TrendReport,
    SuiteComparisonReport,
    TestCaseHealthReport,
} from '../types/testManager';

/**
 * Convert data to CSV format
 */
const arrayToCSV = (data: any[]): string => {
    if (data.length === 0) return '';

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if needed
            if (value === null || value === undefined) return '';
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

/**
 * Trigger CSV file download
 */
const downloadCSV = (csvContent: string, filename: string): void => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export project summary report to CSV
 */
export const exportProjectSummaryToCSV = (
    report: ProjectSummaryReport,
    projectName: string
): void => {
    // Summary data
    const summaryData = [
        {
            Metric: 'Total Runs',
            Value: report.totalRuns,
        },
        {
            Metric: 'Completed Runs',
            Value: report.completedRuns,
        },
        {
            Metric: 'In Progress Runs',
            Value: report.inProgressRuns,
        },
        {
            Metric: 'Average Pass Rate',
            Value: `${report.overallStats.averagePassRate.toFixed(2)}%`,
        },
        {
            Metric: 'Total Passed',
            Value: report.overallStats.totalPassed,
        },
        {
            Metric: 'Total Failed',
            Value: report.overallStats.totalFailed,
        },
        {
            Metric: 'Total Blocked',
            Value: report.overallStats.totalBlocked,
        },
        {
            Metric: 'Total Skipped',
            Value: report.overallStats.totalSkipped,
        },
        {
            Metric: 'Average Duration (seconds)',
            Value: report.overallStats.averageDuration.toFixed(2),
        },
    ];

    let csv = 'Project Summary Report\n';
    csv += `Project: ${projectName}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += arrayToCSV(summaryData);

    // Add suite breakdown if available
    if (report.suiteBreakdown.length > 0) {
        csv += '\n\nSuite Breakdown\n';
        const suiteData = report.suiteBreakdown.map(suite => ({
            'Suite Name': suite.suiteName,
            'Total Runs': suite.totalRuns,
            'Total Tests': suite.totalTests,
            'Average Pass Rate': `${suite.averagePassRate.toFixed(2)}%`,
            'Average Duration (seconds)': suite.averageDuration.toFixed(2),
        }));
        csv += arrayToCSV(suiteData);
    }

    downloadCSV(csv, `project-summary-${Date.now()}.csv`);
};

/**
 * Export trend report to CSV
 */
export const exportTrendReportToCSV = (
    report: TrendReport,
    projectName: string
): void => {
    // Summary data
    const summaryData = [
        {
            Metric: 'Total Runs',
            Value: report.summary.totalRuns,
        },
        {
            Metric: 'Average Pass Rate',
            Value: `${report.summary.averagePassRate}%`,
        },
        {
            Metric: 'Trend Direction',
            Value: report.summary.trendDirection,
        },
        {
            Metric: 'Change Percentage',
            Value: `${report.summary.changePercentage.toFixed(2)}%`,
        },
    ];

    let csv = 'Trend Report\n';
    csv += `Project: ${projectName}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += arrayToCSV(summaryData);

    // Add trend data points
    if (report.dataPoints.length > 0) {
        csv += '\n\nTrend Data Points\n';
        const trendData = report.dataPoints.map(point => ({
            Period: point.periodLabel,
            'Pass Rate': `${point.passRate}%`,
            Passed: point.passed,
            Failed: point.failed,
            Blocked: point.blocked,
            Skipped: point.skipped,
            'Total Tests': point.totalTests,
        }));
        csv += arrayToCSV(trendData);
    }

    downloadCSV(csv, `trend-report-${Date.now()}.csv`);
};

/**
 * Export suite comparison report to CSV
 */
export const exportSuiteComparisonToCSV = (
    report: SuiteComparisonReport,
    projectName: string
): void => {
    let csv = 'Suite Comparison Report\n';
    csv += `Project: ${projectName}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    if (report.suites.length > 0) {
        const suiteData = report.suites.map(suite => ({
            'Suite Name': suite.suiteName,
            'Total Runs': suite.totalRuns,
            'Total Tests': suite.totalTests,
            'Pass Rate': `${suite.passRate.toFixed(2)}%`,
            'Failure Rate': `${suite.failureRate.toFixed(2)}%`,
            Trend: suite.trend,
            'Average Duration (seconds)': suite.averageDuration.toFixed(2),
        }));
        csv += arrayToCSV(suiteData);
    }

    downloadCSV(csv, `suite-comparison-${Date.now()}.csv`);
};

/**
 * Export test case health report to CSV
 */
export const exportTestCaseHealthToCSV = (
    report: TestCaseHealthReport,
    projectName: string
): void => {
    let csv = 'Test Case Health Report\n';
    csv += `Project: ${projectName}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Summary
    const summaryData = [
        {
            Metric: 'Total Unique Cases',
            Value: report.summary.totalUniqueCases,
        },
        {
            Metric: 'Flaky Count',
            Value: report.summary.flakyCount,
        },
        {
            Metric: 'Never Executed Count',
            Value: report.summary.neverExecutedCount,
        },
        {
            Metric: 'High Failure Count',
            Value: report.summary.highFailureCount,
        },
    ];
    csv += arrayToCSV(summaryData);

    // Flaky tests
    if (report.flakyTests.length > 0) {
        csv += '\n\nFlaky Tests\n';
        const flakyData = report.flakyTests.map(test => ({
            'Test Case': test.title,
            Suite: test.suite,
            'Execution Count': test.executionCount,
            'Flaky Score': test.flakyScore,
            'Recent Results': test.recentResults.join(', '),
        }));
        csv += arrayToCSV(flakyData);
    }

    // Most failing tests
    if (report.mostFailingTests.length > 0) {
        csv += '\n\nMost Failing Tests\n';
        const failingData = report.mostFailingTests.map(test => ({
            'Test Case': test.title,
            Suite: test.suite,
            'Execution Count': test.executionCount,
            'Fail Count': test.failCount,
            'Failure Rate': `${test.failureRate.toFixed(2)}%`,
        }));
        csv += arrayToCSV(failingData);
    }

    // Never executed tests
    if (report.neverExecutedTests.length > 0) {
        csv += '\n\nNever Executed Tests\n';
        const neverExecutedData = report.neverExecutedTests.map(test => ({
            'Test Case': test.title,
            Suite: test.suite,
            'Days Since Creation': test.daysSinceCreation,
        }));
        csv += arrayToCSV(neverExecutedData);
    }

    downloadCSV(csv, `test-health-report-${Date.now()}.csv`);
};
