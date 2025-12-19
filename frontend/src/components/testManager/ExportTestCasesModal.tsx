import React, { useState, useEffect } from 'react';
import { X, Download, CheckSquare, Square } from 'lucide-react';
import { CustomFieldDefinition, HiddenDefaultColumns } from '../../types/testManager';
import { ExportColumn, getDefaultExportColumns } from '../../utils/exportTestCases';

interface ExportTestCasesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (columns: ExportColumn[]) => void;
    customFieldDefinitions: CustomFieldDefinition[];
    visibleCustomFieldIds: string[];
    hiddenColumns: HiddenDefaultColumns;
    testCaseCount: number;
}

const ExportTestCasesModal: React.FC<ExportTestCasesModalProps> = ({
    isOpen,
    onClose,
    onExport,
    customFieldDefinitions,
    visibleCustomFieldIds,
    hiddenColumns,
    testCaseCount,
}) => {
    const [columns, setColumns] = useState<ExportColumn[]>([]);

    // Initialize columns when modal opens
    useEffect(() => {
        if (isOpen) {
            const defaultColumns = getDefaultExportColumns(
                customFieldDefinitions,
                visibleCustomFieldIds,
                hiddenColumns
            );
            setColumns(defaultColumns);
        }
    }, [isOpen, customFieldDefinitions, visibleCustomFieldIds, hiddenColumns]);

    if (!isOpen) return null;

    const handleToggleColumn = (columnId: string) => {
        setColumns(prev =>
            prev.map(col =>
                col.id === columnId ? { ...col, enabled: !col.enabled } : col
            )
        );
    };

    const handleSelectAll = () => {
        setColumns(prev => prev.map(col => ({ ...col, enabled: true })));
    };

    const handleDeselectAll = () => {
        setColumns(prev => prev.map(col => ({ ...col, enabled: false })));
    };

    const handleExport = () => {
        onExport(columns);
        onClose();
    };

    const enabledCount = columns.filter(col => col.enabled).length;
    const defaultFieldColumns = columns.filter(col => !col.isCustomField);
    const customFieldColumns = columns.filter(col => col.isCustomField);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div
                className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl border border-white/20 overflow-hidden transform transition-all scale-100 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Download className="h-6 w-6 text-blue-600" />
                            Export Test Cases
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Select columns to include in the CSV export ({testCaseCount} test case{testCaseCount !== 1 ? 's' : ''})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Selection Controls */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                        <button
                            onClick={enabledCount >= columns.length / 2 ? handleDeselectAll : handleSelectAll}
                            className={`text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                                enabledCount >= columns.length / 2
                                    ? 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                        >
                            {enabledCount >= columns.length / 2 ? (
                                <>
                                    <Square className="h-4 w-4" />
                                    Deselect All
                                </>
                            ) : (
                                <>
                                    <CheckSquare className="h-4 w-4" />
                                    Select All
                                </>
                            )}
                        </button>
                        <div className="ml-auto text-sm text-gray-600">
                            {enabledCount} of {columns.length} columns selected
                        </div>
                    </div>

                    {/* Default Fields Section */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                            Default Fields
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {defaultFieldColumns.map(column => (
                                <label
                                    key={column.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={column.enabled}
                                        onChange={() => handleToggleColumn(column.id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                        {column.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Custom Fields Section */}
                    {customFieldColumns.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                Custom Fields
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {customFieldColumns.map(column => (
                                    <label
                                        key={column.id}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={column.enabled}
                                            onChange={() => handleToggleColumn(column.id)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                            {column.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No custom fields message */}
                    {customFieldColumns.length === 0 && (
                        <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg">
                            No custom fields defined for this project
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200/50 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={enabledCount === 0}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export {enabledCount > 0 && `(${enabledCount} columns)`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportTestCasesModal;
