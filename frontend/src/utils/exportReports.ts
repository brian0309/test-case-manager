/**
 * Report Export Utilities
 * Handles exporting analytics/report data to CSV and PDF formats.
 * CSV is downloaded as a file; PDF uses the browser's print-to-PDF dialog.
 */

import {
    ProjectSummaryReport,
    TrendReport,
    SuiteComparisonReport,
    TestCaseHealthReport,
} from '../types/testManager';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function row(...cells: (string | number | null | undefined)[]): string {
    return cells.map(escapeCsv).join(',');
}

function calcPassRate(passed: number, failed: number): string {
    const total = passed + failed;
    if (total === 0) return '0.0%';
    return `${((passed / total) * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function formatDateForFilename(): string {
    return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Build a multi-section CSV string from all available report data.
 * Each section starts with a heading row followed by a header row and data rows.
 */
function buildReportCSV(
    summaryReport: ProjectSummaryReport,
    trendReport: TrendReport | null,
    suiteReport: SuiteComparisonReport | null,
    healthReport: TestCaseHealthReport | null,
): string {
    const sections: string[] = [];

    // -- Summary section --
    const summaryRows: string[] = [
        '=== Project Summary ===',
        row('Metric', 'Value'),
        row('Total Test Runs', summaryReport.totalRuns),
        row('Completed Runs', summaryReport.completedRuns),
        row('In Progress Runs', summaryReport.inProgressRuns),
        row('Draft Runs', summaryReport.draftRuns),
        row('Abandoned Runs', summaryReport.abandonedRuns),
        row('Total Tests Executed', summaryReport.overallStats.totalTests),
        row('Total Passed', summaryReport.overallStats.totalPassed),
        row('Total Failed', summaryReport.overallStats.totalFailed),
        row('Total Blocked', summaryReport.overallStats.totalBlocked),
        row('Total Skipped', summaryReport.overallStats.totalSkipped),
        row('Total Not Run', summaryReport.overallStats.totalNotRun),
        row(
            'Average Pass Rate',
            calcPassRate(
                summaryReport.overallStats.totalPassed,
                summaryReport.overallStats.totalFailed,
            ),
        ),
        row('Average Duration', formatDuration(summaryReport.overallStats.averageDuration)),
    ];

    if (summaryReport.suiteBreakdown.length > 0) {
        summaryRows.push('');
        summaryRows.push('-- Suite Breakdown --');
        summaryRows.push(row('Suite', 'Runs', 'Tests', 'Passed', 'Failed', 'Pass Rate', 'Avg Duration'));
        for (const s of summaryReport.suiteBreakdown) {
            summaryRows.push(
                row(
                    s.suiteName,
                    s.totalRuns,
                    s.totalTests,
                    s.totalPassed,
                    s.totalFailed,
                    calcPassRate(s.totalPassed, s.totalFailed),
                    formatDuration(s.averageDuration),
                ),
            );
        }
    }

    if (summaryReport.recentActivity.length > 0) {
        summaryRows.push('');
        summaryRows.push('-- Recent Activity --');
        summaryRows.push(row('Run Title', 'Status', 'Pass Rate', 'Duration', 'Completed At'));
        for (const a of summaryReport.recentActivity) {
            summaryRows.push(
                row(
                    a.title,
                    a.status,
                    `${a.passRate.toFixed(1)}%`,
                    formatDuration(a.duration),
                    a.completedAt ? new Date(a.completedAt).toLocaleString() : '-',
                ),
            );
        }
    }

    sections.push(summaryRows.join('\r\n'));

    // -- Trends section --
    if (trendReport) {
        const trendRows: string[] = [
            '',
            '=== Trends ===',
            row('Period', 'Runs Completed', 'Total Tests', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Pass Rate', 'Avg Duration'),
        ];
        for (const p of trendReport.dataPoints) {
            trendRows.push(
                row(
                    p.periodLabel,
                    p.runsCompleted,
                    p.totalTests,
                    p.passed,
                    p.failed,
                    p.blocked,
                    p.skipped,
                    `${p.passRate.toFixed(1)}%`,
                    formatDuration(p.averageDuration),
                ),
            );
        }
        sections.push(trendRows.join('\r\n'));
    }

    // -- Suite comparison section --
    if (suiteReport && suiteReport.suites.length > 0) {
        const suiteRows: string[] = [
            '',
            '=== Suite Comparison ===',
            row('Suite', 'Runs', 'Tests', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Pass Rate', 'Failure Rate', 'Trend', 'Avg Duration'),
        ];
        for (const s of suiteReport.suites) {
            suiteRows.push(
                row(
                    s.suiteName,
                    s.totalRuns,
                    s.totalTests,
                    s.passed,
                    s.failed,
                    s.blocked,
                    s.skipped,
                    `${s.passRate.toFixed(1)}%`,
                    `${s.failureRate.toFixed(1)}%`,
                    s.trend,
                    formatDuration(s.averageDuration),
                ),
            );
        }
        sections.push(suiteRows.join('\r\n'));
    }

    // -- Health section --
    if (healthReport) {
        const healthRows: string[] = [
            '',
            '=== Test Case Health ===',
            row('Metric', 'Count'),
            row('Total Unique Cases', healthReport.summary.totalUniqueCases),
            row('Flaky Tests', healthReport.summary.flakyCount),
            row('Never Executed', healthReport.summary.neverExecutedCount),
            row('High Failure Rate', healthReport.summary.highFailureCount),
        ];

        if (healthReport.flakyTests.length > 0) {
            healthRows.push('');
            healthRows.push('-- Flaky Tests --');
            healthRows.push(row('Test Case', 'Suite', 'Executions', 'Passed', 'Failed', 'Flaky Score'));
            for (const t of healthReport.flakyTests) {
                healthRows.push(row(t.title, t.suite, t.executionCount, t.passCount, t.failCount, t.flakyScore));
            }
        }

        if (healthReport.mostFailingTests.length > 0) {
            healthRows.push('');
            healthRows.push('-- Most Failing Tests --');
            healthRows.push(row('Test Case', 'Suite', 'Executions', 'Failures', 'Failure Rate'));
            for (const t of healthReport.mostFailingTests) {
                healthRows.push(row(t.title, t.suite, t.executionCount, t.failCount, `${t.failureRate.toFixed(1)}%`));
            }
        }

        if (healthReport.neverExecutedTests.length > 0) {
            healthRows.push('');
            healthRows.push('-- Never Executed Tests --');
            healthRows.push(row('Test Case', 'Suite', 'Days Since Creation'));
            for (const t of healthReport.neverExecutedTests) {
                healthRows.push(row(t.title, t.suite, t.daysSinceCreation));
            }
        }

        if (healthReport.failedRunCases.length > 0) {
            healthRows.push('');
            healthRows.push('-- Recent Failed Run Cases --');
            healthRows.push(row('Test Case', 'Run Name', 'Suite', 'Area', 'Failed At'));
            for (const t of healthReport.failedRunCases) {
                healthRows.push(
                    row(
                        t.testCaseName,
                        t.runName,
                        t.testSuite,
                        t.area,
                        t.failedAt ? new Date(t.failedAt).toLocaleString() : '-',
                    ),
                );
            }
        }

        sections.push(healthRows.join('\r\n'));
    }

    return sections.join('\r\n');
}

/**
 * Export all available report data to a CSV file.
 */
export function exportReportToCSV(
    summaryReport: ProjectSummaryReport,
    trendReport: TrendReport | null,
    suiteReport: SuiteComparisonReport | null,
    healthReport: TestCaseHealthReport | null,
    projectName?: string,
): void {
    const csv = buildReportCSV(summaryReport, trendReport, suiteReport, healthReport);
    const slug = projectName ? `-${projectName.replace(/[^a-z0-9]/gi, '_')}` : '';
    const filename = `report${slug}-${formatDateForFilename()}.csv`;
    downloadBlob(csv, filename, 'text/csv');
}

// ---------------------------------------------------------------------------
// PDF Export (browser print-to-PDF)
// ---------------------------------------------------------------------------

function htmlTable(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const ths = headers.map(h => `<th>${h}</th>`).join('');
    const trs = rows
        .map(r => {
            const tds = r.map(c => `<td>${c ?? ''}</td>`).join('');
            return `<tr>${tds}</tr>`;
        })
        .join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function section(title: string, content: string): string {
    return `<div class="section"><h2>${title}</h2>${content}</div>`;
}

function kv(label: string, value: string | number): string {
    return `<tr><td class="kv-label">${label}</td><td class="kv-value">${value}</td></tr>`;
}

function kvTable(pairs: [string, string | number][]): string {
    return `<table class="kv-table">${pairs.map(([l, v]) => kv(l, v)).join('')}</table>`;
}

/**
 * Open a print-optimised HTML page with the full report and trigger the
 * browser's print dialog (the user can choose "Save as PDF").
 */
export function exportReportToPDF(
    summaryReport: ProjectSummaryReport,
    trendReport: TrendReport | null,
    suiteReport: SuiteComparisonReport | null,
    healthReport: TestCaseHealthReport | null,
    projectName?: string,
): void {
    const dateRange = `${new Date(summaryReport.dateRange.startDate).toLocaleDateString()} – ${new Date(summaryReport.dateRange.endDate).toLocaleDateString()}`;
    const overallPassRate = calcPassRate(
        summaryReport.overallStats.totalPassed,
        summaryReport.overallStats.totalFailed,
    );

    // ---------- Summary section ----------
    const summaryContent =
        kvTable([
            ['Date Range', dateRange],
            ['Total Test Runs', summaryReport.totalRuns],
            ['Completed Runs', summaryReport.completedRuns],
            ['In Progress Runs', summaryReport.inProgressRuns],
            ['Total Tests Executed', summaryReport.overallStats.totalTests],
            ['Total Passed', summaryReport.overallStats.totalPassed],
            ['Total Failed', summaryReport.overallStats.totalFailed],
            ['Total Blocked', summaryReport.overallStats.totalBlocked],
            ['Total Skipped', summaryReport.overallStats.totalSkipped],
            ['Total Not Run', summaryReport.overallStats.totalNotRun],
            ['Average Pass Rate', overallPassRate],
            ['Average Duration', formatDuration(summaryReport.overallStats.averageDuration)],
        ]) +
        (summaryReport.suiteBreakdown.length > 0
            ? `<h3>Suite Breakdown</h3>` +
              htmlTable(
                  ['Suite', 'Runs', 'Tests', 'Passed', 'Failed', 'Pass Rate', 'Avg Duration'],
                  summaryReport.suiteBreakdown.map(s => [
                      s.suiteName,
                      s.totalRuns,
                      s.totalTests,
                      s.totalPassed,
                      s.totalFailed,
                      calcPassRate(s.totalPassed, s.totalFailed),
                      formatDuration(s.averageDuration),
                  ]),
              )
            : '') +
        (summaryReport.recentActivity.length > 0
            ? `<h3>Recent Activity</h3>` +
              htmlTable(
                  ['Run Title', 'Status', 'Pass Rate', 'Duration', 'Completed At'],
                  summaryReport.recentActivity.map(a => [
                      a.title,
                      a.status,
                      `${a.passRate.toFixed(1)}%`,
                      formatDuration(a.duration),
                      a.completedAt ? new Date(a.completedAt).toLocaleDateString() : '-',
                  ]),
              )
            : '');

    // ---------- Trends section ----------
    const trendsContent = trendReport
        ? htmlTable(
              ['Period', 'Runs', 'Tests', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Pass Rate'],
              trendReport.dataPoints.map(p => [
                  p.periodLabel,
                  p.runsCompleted,
                  p.totalTests,
                  p.passed,
                  p.failed,
                  p.blocked,
                  p.skipped,
                  `${p.passRate.toFixed(1)}%`,
              ]),
          )
        : '<p>No trend data available.</p>';

    // ---------- Suites section ----------
    const suitesContent =
        suiteReport && suiteReport.suites.length > 0
            ? htmlTable(
                  ['Suite', 'Runs', 'Tests', 'Passed', 'Failed', 'Pass Rate', 'Failure Rate', 'Trend', 'Avg Duration'],
                  suiteReport.suites.map(s => [
                      s.suiteName,
                      s.totalRuns,
                      s.totalTests,
                      s.passed,
                      s.failed,
                      `${s.passRate.toFixed(1)}%`,
                      `${s.failureRate.toFixed(1)}%`,
                      s.trend,
                      formatDuration(s.averageDuration),
                  ]),
              )
            : '<p>No suite comparison data available.</p>';

    // ---------- Health section ----------
    let healthContent = '';
    if (healthReport) {
        healthContent +=
            kvTable([
                ['Total Unique Cases', healthReport.summary.totalUniqueCases],
                ['Flaky Tests', healthReport.summary.flakyCount],
                ['Never Executed', healthReport.summary.neverExecutedCount],
                ['High Failure Rate', healthReport.summary.highFailureCount],
            ]);

        if (healthReport.flakyTests.length > 0) {
            healthContent +=
                '<h3>Flaky Tests</h3>' +
                htmlTable(
                    ['Test Case', 'Suite', 'Executions', 'Passed', 'Failed', 'Flaky Score'],
                    healthReport.flakyTests.map(t => [t.title, t.suite, t.executionCount, t.passCount, t.failCount, t.flakyScore]),
                );
        }

        if (healthReport.mostFailingTests.length > 0) {
            healthContent +=
                '<h3>Most Failing Tests</h3>' +
                htmlTable(
                    ['Test Case', 'Suite', 'Executions', 'Failures', 'Failure Rate'],
                    healthReport.mostFailingTests.map(t => [t.title, t.suite, t.executionCount, t.failCount, `${t.failureRate.toFixed(1)}%`]),
                );
        }

        if (healthReport.neverExecutedTests.length > 0) {
            healthContent +=
                '<h3>Never Executed Tests</h3>' +
                htmlTable(
                    ['Test Case', 'Suite', 'Days Since Creation'],
                    healthReport.neverExecutedTests.map(t => [t.title, t.suite, t.daysSinceCreation]),
                );
        }

        if (healthReport.failedRunCases.length > 0) {
            healthContent +=
                '<h3>Recent Failed Run Cases</h3>' +
                htmlTable(
                    ['Test Case', 'Run Name', 'Suite', 'Area', 'Failed At'],
                    healthReport.failedRunCases.map(t => [
                        t.testCaseName,
                        t.runName,
                        t.testSuite,
                        t.area,
                        t.failedAt ? new Date(t.failedAt).toLocaleDateString() : '-',
                    ]),
                );
        }
    } else {
        healthContent = '<p>No health data available.</p>';
    }

    const title = projectName ? `Analytics Report – ${projectName}` : 'Analytics Report';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; margin: 0; padding: 20px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    h2 { font-size: 16px; font-weight: 700; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin-bottom: 12px; color: #1d4ed8; }
    h3 { font-size: 13px; font-weight: 600; margin: 14px 0 8px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; }
    td { padding: 5px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    .kv-table td.kv-label { font-weight: 600; width: 220px; background: #f3f4f6; }
    .kv-table td.kv-value { }
    p { color: #6b7280; }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; Date Range: ${dateRange}</div>
  ${section('Summary', summaryContent)}
  ${section('Trends', trendsContent)}
  ${section('Suite Comparison', suitesContent)}
  ${section('Test Case Health', healthContent)}
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
        // Fallback if popup is blocked
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.click();
    }
    // Revoke after a delay to allow the new window to fully load before the URL is released
    const PDF_URL_REVOKE_DELAY_MS = 60_000;
    setTimeout(() => URL.revokeObjectURL(url), PDF_URL_REVOKE_DELAY_MS);
}
