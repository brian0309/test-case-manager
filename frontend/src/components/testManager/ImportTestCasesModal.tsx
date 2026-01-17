import React, { useState } from 'react';
import { X, Upload, FileUp, AlertCircle, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import Papa from 'papaparse';
import { CustomFieldDefinition, Priority, Status } from '../../types/testManager';
import { CreateTestCaseRequest } from '../../types/api/testManager.api';

interface ImportTestCasesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (testCases: CreateTestCaseRequest[], skipDuplicates: boolean) => Promise<{
        created: number;
        skipped: number;
        failed: number;
        errors: Array<{ index: number; title?: string; message: string }>;
        duplicates?: string[];
    }>;
    customFieldDefinitions: CustomFieldDefinition[];
    projectMembers: Array<{ id: string; name: string }>;
}

interface ColumnMapping {
    csvColumn: string;
    testCaseField: string;
    customFieldId?: string;
}

interface ParsedRow {
    [key: string]: string;
}

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

const ImportTestCasesModal: React.FC<ImportTestCasesModalProps> = ({
    isOpen,
    onClose,
    onImport,
    customFieldDefinitions,
    projectMembers,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<ParsedRow[]>([]);
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{
        created: number;
        skipped: number;
        failed: number;
        errors: Array<{ index: number; title?: string; message: string }>;
        duplicates?: string[];
    } | null>(null);

    // Step 1: File upload, Step 2: Column mapping, Step 3: Validation preview, Step 4: Results
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Available test case fields for mapping
    const testCaseFields = [
        { value: '', label: '-- Do not import --' },
        { value: 'title', label: 'Title (Required)' },
        { value: 'priority', label: 'Priority' },
        { value: 'status', label: 'Status' },
        { value: 'area', label: 'Area' },
        { value: 'assignedTesterName', label: 'Assigned Tester (Name)' },
        { value: 'testDescription', label: 'Test Description' },
        { value: 'stepsContent', label: 'Steps Content' },
        { value: 'expectedResult', label: 'Expected Result' },
        { value: 'comments', label: 'Comments' },
    ];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || [];
                const data = results.data as ParsedRow[];

                setCsvData(data);

                // Auto-detect column mappings
                const mappings = autoDetectMappings(headers);
                setColumnMappings(mappings);

                setStep(2);
            },
            error: (error) => {
                alert(`Error parsing CSV: ${(error as Error).message}`);
            },
        });
    };

    const autoDetectMappings = (headers: string[]): ColumnMapping[] => {
        return headers.map((header) => {
            const lowerHeader = header.toLowerCase().trim();

            // Try to match default fields
            let testCaseField = '';
            if (lowerHeader === 'title' || lowerHeader === 'test case' || lowerHeader === 'name') {
                testCaseField = 'title';
            } else if (lowerHeader === 'priority') {
                testCaseField = 'priority';
            } else if (lowerHeader === 'status') {
                testCaseField = 'status';
            } else if (lowerHeader === 'area' || lowerHeader === 'category') {
                testCaseField = 'area';
            } else if (lowerHeader === 'assigned tester' || lowerHeader === 'tester' || lowerHeader === 'assignedtester') {
                testCaseField = 'assignedTesterName';
            } else if (lowerHeader === 'description' || lowerHeader === 'test description' || lowerHeader === 'testdescription') {
                testCaseField = 'testDescription';
            } else if (lowerHeader === 'steps' || lowerHeader === 'steps content' || lowerHeader === 'stepscontent') {
                testCaseField = 'stepsContent';
            } else if (lowerHeader === 'expected result' || lowerHeader === 'expectedresult' || lowerHeader === 'expected') {
                testCaseField = 'expectedResult';
            } else if (lowerHeader === 'comments' || lowerHeader === 'notes') {
                testCaseField = 'comments';
            } else {
                // Try to match custom fields
                const matchedCustomField = customFieldDefinitions.find(
                    (cf) =>
                        !cf.deleted &&
                        (cf.label.toLowerCase() === lowerHeader || cf.key?.toLowerCase() === lowerHeader)
                );

                if (matchedCustomField) {
                    return {
                        csvColumn: header,
                        testCaseField: 'customField',
                        customFieldId: matchedCustomField.id,
                    };
                }
            }

            return {
                csvColumn: header,
                testCaseField,
            };
        });
    };

    const handleMappingChange = (csvColumn: string, newMapping: string) => {
        setColumnMappings((prev) =>
            prev.map((mapping) => {
                if (mapping.csvColumn === csvColumn) {
                    // Check if it's a custom field
                    const customField = customFieldDefinitions.find(
                        (cf) => `custom_${cf.id}` === newMapping
                    );

                    if (customField) {
                        return {
                            csvColumn,
                            testCaseField: 'customField',
                            customFieldId: customField.id,
                        };
                    }

                    return {
                        csvColumn,
                        testCaseField: newMapping,
                    };
                }
                return mapping;
            })
        );
    };

    const getDuplicateMappings = (): string[] => {
        const mappedFields: { [key: string]: number } = {};
        const duplicates: string[] = [];

        columnMappings.forEach((mapping) => {
            // Skip unmapped columns
            if (!mapping.testCaseField || mapping.testCaseField === '') {
                return;
            }

            // Create a unique key for the mapping
            const key =
                mapping.testCaseField === 'customField' && mapping.customFieldId
                    ? `custom_${mapping.customFieldId}`
                    : mapping.testCaseField;

            mappedFields[key] = (mappedFields[key] || 0) + 1;

            // Add to duplicates if this is the second occurrence
            if (mappedFields[key] === 2) {
                // Find the field label
                if (mapping.testCaseField === 'customField' && mapping.customFieldId) {
                    const customField = customFieldDefinitions.find(
                        (cf) => cf.id === mapping.customFieldId
                    );
                    duplicates.push(customField?.label || 'Unknown Custom Field');
                } else {
                    const field = testCaseFields.find((f) => f.value === mapping.testCaseField);
                    duplicates.push(field?.label || mapping.testCaseField);
                }
            }
        });

        return duplicates;
    };

    const validateData = (): boolean => {
        const errors: ValidationError[] = [];

        // Check for duplicate mappings
        const duplicates = getDuplicateMappings();
        if (duplicates.length > 0) {
            alert(
                `Cannot proceed: The following fields are mapped multiple times:\n\n${duplicates.join(', ')}\n\nEach field can only be mapped once.`
            );
            return false;
        }

        // Check if title is mapped
        const titleMapping = columnMappings.find((m) => m.testCaseField === 'title');
        if (!titleMapping) {
            alert('Title field must be mapped to proceed with import');
            return false;
        }

        // Validate each row
        csvData.forEach((row, index) => {
            const rowNum = index + 1;

            // Check title
            const title = row[titleMapping.csvColumn]?.trim();
            if (!title) {
                errors.push({
                    row: rowNum,
                    field: 'Title',
                    message: 'Title is required',
                });
            }

            // Validate priority if mapped
            const priorityMapping = columnMappings.find((m) => m.testCaseField === 'priority');
            if (priorityMapping) {
                const priority = row[priorityMapping.csvColumn]?.trim();
                if (priority && !Object.values(Priority).includes(priority as Priority)) {
                    errors.push({
                        row: rowNum,
                        field: 'Priority',
                        message: `Invalid priority: "${priority}". Must be one of: ${Object.values(Priority).join(', ')}`,
                    });
                }
            }

            // Validate status if mapped
            const statusMapping = columnMappings.find((m) => m.testCaseField === 'status');
            if (statusMapping) {
                const status = row[statusMapping.csvColumn]?.trim();
                if (status && !Object.values(Status).includes(status as Status)) {
                    errors.push({
                        row: rowNum,
                        field: 'Status',
                        message: `Invalid status: "${status}". Must be one of: ${Object.values(Status).join(', ')}`,
                    });
                }
            }

            // Validate custom field dropdowns
            columnMappings.forEach((mapping) => {
                if (mapping.customFieldId) {
                    const customField = customFieldDefinitions.find((cf) => cf.id === mapping.customFieldId);
                    if (customField?.type === 'dropdown' && customField.options) {
                        const value = row[mapping.csvColumn]?.trim();
                        if (value) {
                            const validOptions = customField.options.map((opt) => opt.label);
                            if (!validOptions.includes(value)) {
                                errors.push({
                                    row: rowNum,
                                    field: customField.label,
                                    message: `Invalid value: "${value}". Must be one of: ${validOptions.join(', ')}`,
                                });
                            }
                        }
                    }
                }
            });
        });

        setValidationErrors(errors);
        setStep(3);
        return true;
    };

    const transformData = (): CreateTestCaseRequest[] => {
        return csvData.map((row) => {
            const testCase: CreateTestCaseRequest & { assignedTesterName?: string; [key: string]: unknown } = {
                title: '',
            };

            const customFields: Record<string, string> = {};

            columnMappings.forEach((mapping) => {
                const value = row[mapping.csvColumn]?.trim() || '';

                if (mapping.testCaseField === 'customField' && mapping.customFieldId) {
                    customFields[mapping.customFieldId] = value;
                } else if (mapping.testCaseField && mapping.testCaseField !== '') {
                    if (mapping.testCaseField === 'priority') {
                        testCase.priority = value as Priority;
                    } else if (mapping.testCaseField === 'status') {
                        testCase.status = value as Status;
                    } else if (mapping.testCaseField === 'assignedTesterName') {
                        // Store name temporarily for lookup
                        testCase.assignedTesterName = value;
                    } else {
                        testCase[mapping.testCaseField] = value;
                    }
                }
            });

            // Convert tester name to ID if provided
            if (testCase.assignedTesterName) {
                const testerName = testCase.assignedTesterName.toLowerCase();
                const matchedMember = projectMembers.find(
                    (member) => member.name.toLowerCase() === testerName
                );
                if (matchedMember) {
                    testCase.assignedTesterId = matchedMember.id;
                }
                delete testCase.assignedTesterName;
            }

            if (Object.keys(customFields).length > 0) {
                testCase.customFields = customFields;
            }

            return testCase as CreateTestCaseRequest;
        });
    };

    const handleImport = async () => {
        setImporting(true);

        try {
            const testCases = transformData();
            const result = await onImport(testCases, skipDuplicates);
            setImportResult(result);
            setStep(4);
        } catch (error: unknown) {
            alert(`Import failed: ${(error as Error).message || 'Unknown error'}`);
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setCsvData([]);
        setColumnMappings([]);
        setValidationErrors([]);
        setImportResult(null);
        setStep(1);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const downloadErrorReport = () => {
        if (!importResult) return;

        const errorRows = importResult.errors.map((error) => ({
            Row: error.index,
            Title: error.title || 'N/A',
            Error: error.message,
        }));

        const csv = Papa.unparse(errorRows);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    const validCount = csvData.length - validationErrors.length;
    const duplicateMappings = step === 2 ? getDuplicateMappings() : [];
    const hasDuplicateMappings = duplicateMappings.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all scale-100 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            Import Test Cases
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {step === 1 && 'Upload a CSV file to import test cases'}
                            {step === 2 && `Map columns from your CSV (${csvData.length} rows detected)`}
                            {step === 3 && 'Review validation results before importing'}
                            {step === 4 && 'Import completed'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Step 1: File Upload */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-full max-w-md">
                                <label
                                    htmlFor="csv-upload"
                                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FileUp className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                                        <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">CSV files only</p>
                                        {file && (
                                            <p className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-medium">{file.name}</p>
                                        )}
                                    </div>
                                    <input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>

                                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-2">CSV Format Requirements:</p>
                                    <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                                        <li>First row must contain column headers</li>
                                        <li>Title column is required</li>
                                        <li>Priority values: Low, Medium, High, Critical</li>
                                        <li>Status values: Draft, Passed, Failed, Retest, Pass - Fixed, Skipped</li>
                                        <li>Custom fields must match existing field names</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Column Mapping */}
                    {step === 2 && (
                        <div>
                            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-yellow-900 dark:text-yellow-300">
                                    <p className="font-medium mb-1">Map your CSV columns to test case fields</p>
                                    <p className="text-yellow-800 dark:text-yellow-400">
                                        Title field is required. All other fields are optional. Unmapped columns will be ignored.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                {columnMappings.map((mapping, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                CSV Column
                                            </label>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                                {mapping.csvColumn}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Preview: {csvData[0]?.[mapping.csvColumn]?.substring(0, 50)}
                                                {(csvData[0]?.[mapping.csvColumn]?.length || 0) > 50 ? '...' : ''}
                                            </p>
                                        </div>

                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                Maps to
                                            </label>
                                            <select
                                                value={
                                                    mapping.customFieldId
                                                        ? `custom_${mapping.customFieldId}`
                                                        : mapping.testCaseField
                                                }
                                                onChange={(e) =>
                                                    handleMappingChange(mapping.csvColumn, e.target.value)
                                                }
                                                className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                            >
                                                {testCaseFields.map((field) => (
                                                    <option key={field.value} value={field.value}>
                                                        {field.label}
                                                    </option>
                                                ))}
                                                {customFieldDefinitions.filter((cf) => !cf.deleted).length > 0 && (
                                                    <optgroup label="Custom Fields">
                                                        {customFieldDefinitions
                                                            .filter((cf) => !cf.deleted)
                                                            .map((cf) => (
                                                                <option key={cf.id} value={`custom_${cf.id}`}>
                                                                    {cf.label} ({cf.type})
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            {/* Duplicate Mapping Warning */}
                            {hasDuplicateMappings && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-900 dark:text-red-300">
                                        <p className="font-medium mb-1">Duplicate mappings detected</p>
                                        <p className="text-red-800 dark:text-red-400">
                                            The following fields are mapped multiple times: {duplicateMappings.join(', ')}
                                        </p>
                                        <p className="text-red-700 dark:text-red-400 mt-1">
                                            Each field can only be mapped once. Please adjust your mappings to proceed.
                                        </p>
                                    </div>
                                </div>
                            )}

                            </div>

                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="skip-duplicates"
                                    checked={skipDuplicates}
                                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                                />
                                <label htmlFor="skip-duplicates" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <span className="font-medium">Skip duplicate titles</span>
                                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                                        (Test cases with the same title in this suite will be skipped)
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Validation Preview */}
                    {step === 3 && (
                        <div>
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-green-900 dark:text-green-300">Valid</span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">{validCount}</p>
                                </div>

                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        <span className="text-sm font-medium text-red-900 dark:text-red-300">Errors</span>
                                    </div>
                                    <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">
                                        {validationErrors.length}
                                    </p>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <FileUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Total</span>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{csvData.length}</p>
                                </div>
                            </div>

                            {/* Validation Errors */}
                            {validationErrors.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        <h3 className="text-sm font-semibold text-red-900 dark:text-red-300">Validation Errors</h3>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs uppercase text-red-900 dark:text-red-300 border-b border-red-200 dark:border-red-900/50">
                                                <tr>
                                                    <th className="text-left py-2 px-3">Row</th>
                                                    <th className="text-left py-2 px-3">Field</th>
                                                    <th className="text-left py-2 px-3">Error</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-red-800 dark:text-red-300">
                                                {validationErrors.slice(0, 50).map((error, index) => (
                                                    <tr key={index} className="border-b border-red-100 dark:border-red-900/50">
                                                        <td className="py-2 px-3">{error.row}</td>
                                                        <td className="py-2 px-3 font-medium">{error.field}</td>
                                                        <td className="py-2 px-3">{error.message}</td>
                                                    </tr>
                                                ))}
                                                {validationErrors.length > 50 && (
                                                    <tr>
                                                        <td colSpan={3} className="py-2 px-3 text-center italic">
                                                            ... and {validationErrors.length - 50} more errors
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                                        Rows with errors will not be imported. You can proceed to import valid rows only.
                                    </p>
                                </div>
                            )}

                            {validationErrors.length === 0 && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    <div>
                                        <p className="text-sm font-medium text-green-900 dark:text-green-300">All rows are valid!</p>
                                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                            {validCount} test case{validCount !== 1 ? 's' : ''} ready to import
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {step === 4 && importResult && (
                        <div>
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-green-900 dark:text-green-300">Created</span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">{importResult.created}</p>
                                </div>

                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                                        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">Skipped</span>
                                    </div>
                                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-2">{importResult.skipped}</p>
                                </div>

                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        <span className="text-sm font-medium text-red-900 dark:text-red-300">Failed</span>
                                    </div>
                                    <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">{importResult.failed}</p>
                                </div>
                            </div>

                            {/* Duplicates */}
                            {importResult.skipped > 0 && importResult.duplicates && importResult.duplicates.length > 0 && (
                                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                                        <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">Skipped Duplicates</h3>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto">
                                        <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                                            {importResult.duplicates.slice(0, 10).map((title, index) => (
                                                <li key={index}>• {title}</li>
                                            ))}
                                            {importResult.duplicates.length > 10 && (
                                                <li className="italic">
                                                    ... and {importResult.duplicates.length - 10} more
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {importResult.failed > 0 && importResult.errors.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                            <h3 className="text-sm font-semibold text-red-900 dark:text-red-300">Import Errors</h3>
                                        </div>
                                        <button
                                            onClick={downloadErrorReport}
                                            className="text-xs text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                                        >
                                            <Download className="h-3 w-3" />
                                            Download Error Report
                                        </button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs uppercase text-red-900 dark:text-red-300 border-b border-red-200 dark:border-red-900/50">
                                                <tr>
                                                    <th className="text-left py-2 px-3">Row</th>
                                                    <th className="text-left py-2 px-3">Title</th>
                                                    <th className="text-left py-2 px-3">Error</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-red-800 dark:text-red-300">
                                                {importResult.errors.slice(0, 20).map((error, index) => (
                                                    <tr key={index} className="border-b border-red-100 dark:border-red-900/50">
                                                        <td className="py-2 px-3">{error.index}</td>
                                                        <td className="py-2 px-3">{error.title || 'N/A'}</td>
                                                        <td className="py-2 px-3">{error.message}</td>
                                                    </tr>
                                                ))}
                                                {importResult.errors.length > 20 && (
                                                    <tr>
                                                        <td colSpan={3} className="py-2 px-3 text-center italic">
                                                            ... and {importResult.errors.length - 20} more errors
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {importResult.created > 0 && importResult.failed === 0 && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    <div>
                                        <p className="text-sm font-medium text-green-900 dark:text-green-300">Import completed successfully!</p>
                                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                            {importResult.created} test case{importResult.created !== 1 ? 's' : ''} imported
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {step === 2 && (
                            <span>
                                {csvData.length} row{csvData.length !== 1 ? 's' : ''} will be imported
                            </span>
                        )}
                        {step === 3 && (
                            <span>
                                {validCount} valid, {validationErrors.length} errors
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {step < 4 && (
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        )}

                        {step === 2 && (
                            <>
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => validateData()}
                                    disabled={hasDuplicateMappings}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                                    title={hasDuplicateMappings ? 'Fix duplicate mappings to proceed' : ''}
                                >
                                    Next: Validate
                                </button>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={importing || validCount === 0}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {importing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Import {validCount > 0 && `(${validCount} test cases)`}
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        {step === 4 && (
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportTestCasesModal;
