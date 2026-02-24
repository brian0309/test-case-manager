/**
 * Test Case Export Utilities
 * Handles exporting test cases to CSV and XLSX format with custom field support
 */

import * as XLSX from 'xlsx';
import { TestCase, CustomFieldDefinition, HiddenDefaultColumns } from '../types/testManager';
import { stripHtmlPreserveLineBreaks } from './sanitize';

/**
 * Escape CSV values to handle quotes, commas, and newlines
 */
function escapeCsvValue(value: string | undefined | null): string {
    if (value === undefined || value === null) return '';
    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

/**
 * Format date string for CSV export
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

export interface ExportColumn {
    id: string;
    label: string;
    enabled: boolean;
    isCustomField?: boolean;
    customFieldId?: string;
}

export interface ExportOptions {
    columns: ExportColumn[];
}

/**
 * Export test cases to CSV format (RFC 4180 compliant, UTF-8 BOM for Excel)
 */
export function exportTestCasesToCSV(
    testCases: TestCase[],
    options: ExportOptions,
    _customFieldDefinitions: CustomFieldDefinition[],
    projectName?: string,
    suiteName?: string
): void {
    const enabledColumns = options.columns.filter(col => col.enabled);

    if (enabledColumns.length === 0) {
        throw new Error('Please select at least one column to export');
    }

    // Build rows using shared helper, then apply CSV escaping
    const rows = buildRows(testCases, enabledColumns);
    const csvRows = rows.map(row => row.map(cell => escapeCsvValue(cell)).join(','));

    // Combine rows with CRLF per RFC 4180
    const csvContent = csvRows.join('\r\n');

    // Create blob with UTF-8 BOM so Excel opens it correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = 'test-cases';
    if (projectName) filename += `-${projectName.replace(/[^a-z0-9]/gi, '_')}`;
    if (suiteName) filename += `-${suiteName.replace(/[^a-z0-9]/gi, '_')}`;
    filename += `-${timestamp}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Build the rows array shared between CSV and XLSX export
 */
function buildRows(
    testCases: TestCase[],
    enabledColumns: ExportColumn[]
): string[][] {
    const header = enabledColumns.map(col => col.label);
    const rows: string[][] = [header];

    testCases.forEach(testCase => {
        const rowValues = enabledColumns.map(col => {
            if (col.isCustomField && col.customFieldId) {
                return testCase.customFields?.[col.customFieldId] || '';
            }
            switch (col.id) {
                case 'id': return testCase.id || '';
                case 'title': return testCase.title || '';
                case 'priority': return testCase.priority || '';
                case 'status': return testCase.status || '';
                case 'assignedTester': return testCase.assignedTester?.name || '';
                case 'area': return testCase.area || '';
                case 'suite': return testCase.suite || '';
                case 'testDescription': return testCase.testDescription || '';
                case 'stepsContent': return stripHtmlPreserveLineBreaks(testCase.stepsContent);
                case 'expectedResult': return stripHtmlPreserveLineBreaks(testCase.expectedResult);
                case 'comments': return stripHtmlPreserveLineBreaks(testCase.comments);
                case 'lastModified': return formatDate(testCase.lastModified);
                case 'order': return testCase.order?.toString() || '';
                default: return '';
            }
        });
        rows.push(rowValues);
    });

    return rows;
}

/**
 * Export test cases to XLSX format
 */
export function exportTestCasesToXLSX(
    testCases: TestCase[],
    options: ExportOptions,
    _customFieldDefinitions: CustomFieldDefinition[],
    projectName?: string,
    suiteName?: string
): void {
    const enabledColumns = options.columns.filter(col => col.enabled);
    if (enabledColumns.length === 0) {
        throw new Error('Please select at least one column to export');
    }

    const rows = buildRows(testCases, enabledColumns);
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto-width columns
    const colWidths = enabledColumns.map((col, i) => ({
        wch: Math.max(
            col.label.length,
            ...rows.slice(1).map(r => Math.min((r[i] || '').length, 80))
        ),
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');

    const timestamp = new Date().toISOString().split('T')[0];
    let filename = 'test-cases';
    if (projectName) filename += `-${projectName.replace(/[^a-z0-9]/gi, '_')}`;
    if (suiteName) filename += `-${suiteName.replace(/[^a-z0-9]/gi, '_')}`;
    filename += `-${timestamp}.xlsx`;

    XLSX.writeFile(wb, filename);
}

/**
 * Get default export columns based on project settings and custom fields
 */
export function getDefaultExportColumns(
    customFieldDefinitions: CustomFieldDefinition[],
    visibleCustomFieldIds: string[],
    hiddenColumns: HiddenDefaultColumns = {}
): ExportColumn[] {
    const defaultColumns: ExportColumn[] = [
        { id: 'id', label: 'ID', enabled: !hiddenColumns.id },
        { id: 'title', label: 'Title', enabled: !hiddenColumns.title },
        { id: 'priority', label: 'Priority', enabled: !hiddenColumns.priority },
        { id: 'status', label: 'Status', enabled: !hiddenColumns.status },
        { id: 'assignedTester', label: 'Assigned Tester', enabled: !hiddenColumns.assignedTester },
        { id: 'area', label: 'Area', enabled: true }, // Not in hiddenColumns, default to true
        { id: 'suite', label: 'Suite', enabled: true }, // Not in hiddenColumns, default to true
        { id: 'testDescription', label: 'Description', enabled: true }, // Not in hiddenColumns, default to true
        { id: 'stepsContent', label: 'Steps', enabled: true }, // Not in hiddenColumns, default to true
        { id: 'expectedResult', label: 'Expected Result', enabled: true }, // Not in hiddenColumns, default to true
        { id: 'comments', label: 'Comments', enabled: true }, // Not in hiddenColumns, default to true
        { id: 'lastModified', label: 'Last Modified', enabled: !hiddenColumns.lastModified },
        { id: 'order', label: 'Order', enabled: true }, // Not in hiddenColumns, default to true
    ];

    // Add custom fields
    const customFieldColumns: ExportColumn[] = customFieldDefinitions
        .filter(field => !field.deleted && visibleCustomFieldIds.includes(field.id))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(field => ({
            id: `custom_${field.id}`,
            label: field.label,
            enabled: field.showOnTableByDefault !== false,
            isCustomField: true,
            customFieldId: field.id,
        }));

    return [...defaultColumns, ...customFieldColumns];
}
