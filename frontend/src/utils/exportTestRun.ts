/**
 * Test Run Export Utilities
 * Handles exporting test run items to CSV and XLSX format
 */

import * as XLSX from 'xlsx';
import { TestRun, RunItem } from '../types/testManager';
import { stripHtmlPreserveLineBreaks } from './sanitize';

/**
 * Escape CSV values to handle quotes, commas, and newlines
 */
function escapeCsvValue(value: string | undefined | null): string {
    if (value === undefined || value === null) return '';
    const stringValue = String(value);

    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

/**
 * Format date string for export
 */
function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
        return dateString;
    }
}

/**
 * Format time spent in minutes to a human-readable string
 */
function formatTimeSpent(minutes: number | undefined): string {
    if (minutes === undefined || minutes === null) return '';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const RUN_EXPORT_HEADERS = [
    '#',
    'Title',
    'Priority',
    'Run Status',
    'Suite',
    'Area',
    'Assigned To',
    'Executed By',
    'Executed At',
    'Time Spent',
    'Test Description',
    'Steps',
    'Expected Result',
    'Actual Result',
];

/**
 * Build the rows array for a test run export
 */
function buildRunRows(
    testRun: TestRun,
    suiteNameByItemId: Map<string, string | null>
): string[][] {
    const rows: string[][] = [RUN_EXPORT_HEADERS];

    testRun.items.forEach((item: RunItem, idx: number) => {
        const snap = item.caseSnapshot;
        const suiteName = suiteNameByItemId.get(item.id) || snap.suiteName || '';
        rows.push([
            String(idx + 1),
            snap.title || '',
            snap.priority || '',
            item.status || '',
            suiteName,
            snap.area || '',
            item.assignedTo?.name || '',
            item.executedBy?.name || '',
            formatDate(item.executedAt),
            formatTimeSpent(item.timeSpent),
            stripHtmlPreserveLineBreaks(snap.testDescription),
            stripHtmlPreserveLineBreaks(snap.stepsContent),
            stripHtmlPreserveLineBreaks(snap.expectedResult),
            stripHtmlPreserveLineBreaks(item.actualResult),
        ]);
    });

    return rows;
}

/**
 * Generate a safe filename prefix from the test run title
 */
function buildFilename(testRun: TestRun, extension: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = testRun.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return `test-run-${safeName}-${timestamp}.${extension}`;
}

/**
 * Export a test run to CSV format (RFC 4180 compliant, UTF-8 BOM for Excel)
 */
export function exportTestRunToCSV(
    testRun: TestRun,
    suiteNameByItemId: Map<string, string | null>
): void {
    const rows = buildRunRows(testRun, suiteNameByItemId);
    const csvRows = rows.map(row => row.map(cell => escapeCsvValue(cell)).join(','));
    const csvContent = csvRows.join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', buildFilename(testRun, 'csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export a test run to XLSX format
 */
export function exportTestRunToXLSX(
    testRun: TestRun,
    suiteNameByItemId: Map<string, string | null>
): void {
    const rows = buildRunRows(testRun, suiteNameByItemId);
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto-width columns
    ws['!cols'] = RUN_EXPORT_HEADERS.map((header, i) => {
        let maxLen = header.length;
        for (let r = 1; r < rows.length; r++) {
            const cellLen = Math.min((rows[r][i] || '').length, 80);
            if (cellLen > maxLen) maxLen = cellLen;
        }
        return { wch: maxLen };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Run');

    XLSX.writeFile(wb, buildFilename(testRun, 'xlsx'));
}
