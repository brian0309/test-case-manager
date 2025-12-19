/**
 * Test Case Export Utilities
 * Handles exporting test cases to CSV format with custom field support
 */

import { TestCase, CustomFieldDefinition, HiddenDefaultColumns } from '../types/testManager';

/**
 * Strip HTML tags from rich text content
 */
function stripHtml(html: string | undefined): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

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
 * Export test cases to CSV format
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

    // Build CSV header
    const headers = enabledColumns.map(col => escapeCsvValue(col.label));
    const csvRows = [headers.join(',')];

    // Build CSV rows
    testCases.forEach(testCase => {
        const rowValues = enabledColumns.map(col => {
            // Handle custom fields
            if (col.isCustomField && col.customFieldId) {
                const value = testCase.customFields?.[col.customFieldId] || '';
                return escapeCsvValue(value);
            }

            // Handle default fields
            switch (col.id) {
                case 'id':
                    return escapeCsvValue(testCase.id);
                case 'title':
                    return escapeCsvValue(testCase.title);
                case 'priority':
                    return escapeCsvValue(testCase.priority);
                case 'status':
                    return escapeCsvValue(testCase.status);
                case 'assignedTester':
                    return escapeCsvValue(testCase.assignedTester?.name || '');
                case 'area':
                    return escapeCsvValue(testCase.area || '');
                case 'suite':
                    return escapeCsvValue(testCase.suite || '');
                case 'testDescription':
                    return escapeCsvValue(testCase.testDescription || '');
                case 'stepsContent':
                    return escapeCsvValue(stripHtml(testCase.stepsContent));
                case 'expectedResult':
                    return escapeCsvValue(stripHtml(testCase.expectedResult));
                case 'comments':
                    return escapeCsvValue(stripHtml(testCase.comments));
                case 'lastModified':
                    return escapeCsvValue(formatDate(testCase.lastModified));
                case 'order':
                    return escapeCsvValue(testCase.order?.toString() || '');
                default:
                    return '';
            }
        });

        csvRows.push(rowValues.join(','));
    });

    // Combine all rows
    const csvContent = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
