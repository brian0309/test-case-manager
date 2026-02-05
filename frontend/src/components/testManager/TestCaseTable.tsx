
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { List, RowComponentProps } from 'react-window';
import { TestCase, Priority, Status, CustomFieldDefinition, HiddenDefaultColumns } from '../../types/testManager';
import StatusBadge from './StatusBadge';
import { Edit, Copy, GripVertical, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, ChevronRight } from 'lucide-react';
import IdDisplay from './IdDisplay';

const ROW_HEIGHT = 56; // Fixed row height for virtualization

// Custom row props for react-window v2
interface VirtualRowProps {
    items: TestCase[];
    selectedIds: string[];
    isSelectionMode: boolean;
    isEditMode: boolean;
    enableReorder: boolean;
    onRowClick: (item: TestCase) => void;
    onToggleSelection?: (id: string) => void;
    onStatusChange?: (caseId: string, status: Status) => void;
    onViewClick?: (item: TestCase) => void;
    onCloneClick?: (item: TestCase) => void;
    onUpdate?: (id: string, field: keyof TestCase, value: string | number | boolean | Status | Priority) => void;
    getStatusColor: (status: Status) => string;
    customFieldDefinitions: CustomFieldDefinition[];
    visibleCustomFieldIds: string[];
    hiddenColumns: HiddenDefaultColumns;
    activeArea?: string | null;
    activeSuiteId?: string | null;
    gridTemplateColumns: string;
}


type SortField = 'title' | 'priority' | 'status' | 'lastModified' | 'assignedTester';
type SortOrder = 'asc' | 'desc';

export interface SortInfo {
    sortMode: 'custom' | 'standard';
    sortField: SortField;
    sortOrder: SortOrder;
    resetToCustomOrder: () => void;
}

interface TestCaseTableProps {
    data: TestCase[];
    onRowClick: (item: TestCase) => void;
    onStatusChange?: (caseId: string, status: Status) => void;
    onViewClick?: (item: TestCase) => void;
    onCloneClick?: (item: TestCase) => void;
    isEditMode?: boolean;
    onUpdate?: (id: string, field: keyof TestCase, value: string | number | boolean | Status | Priority) => void;
    // Selection props
    isSelectionMode?: boolean;
    selectedIds?: string[];
    onToggleSelection?: (id: string) => void;
    onSelectAll?: (selectAll: boolean) => void;
    // Reorder props
    enableReorder?: boolean;
    onReorder?: (items: TestCase[]) => void;
    // Custom fields and visibility
    customFieldDefinitions?: CustomFieldDefinition[];
    visibleCustomFieldIds?: string[];
    hiddenColumns?: HiddenDefaultColumns;
    // Show sorting controls in header (desktop only)
    showSortControlsInHeader?: boolean;
    // Callback to expose sorting state to parent
    onSortInfoChange?: (sortInfo: SortInfo) => void;
    // Context info
    activeArea?: string | null;
    activeSuiteId?: string | null;
}


interface SortableRowProps {
    item: TestCase;
    isSelected: boolean;
    isSelectionMode: boolean;
    isEditMode: boolean;
    enableReorder: boolean;
    onRowClick: (item: TestCase) => void;
    onToggleSelection?: (id: string) => void;
    onStatusChange?: (caseId: string, status: Status) => void;
    onViewClick?: (item: TestCase) => void;
    onCloneClick?: (item: TestCase) => void;
    onUpdate?: (id: string, field: keyof TestCase, value: string | number | boolean | Status | Priority) => void;
    getStatusColor: (status: Status) => string;
    // Custom fields and visibility
    customFieldDefinitions?: CustomFieldDefinition[];
    visibleCustomFieldIds?: string[];
    hiddenColumns?: HiddenDefaultColumns;
    activeArea?: string | null;
    activeSuiteId?: string | null;
    // Virtualization style
    style?: React.CSSProperties;
    // Grid template for consistent column sizing
    gridTemplateColumns: string;
}

const SortableRow: React.FC<SortableRowProps> = ({
    item,
    isSelected,
    isSelectionMode,
    isEditMode,
    enableReorder,
    onRowClick,
    onToggleSelection,
    onStatusChange,
    onViewClick,
    onCloneClick,
    onUpdate,
    getStatusColor,
    customFieldDefinitions = [],
    visibleCustomFieldIds = [],
    hiddenColumns = {},
    activeArea,
    activeSuiteId,
    style: virtualizationStyle,
    gridTemplateColumns,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        disabled: !enableReorder,
    });

    const dragStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : undefined,
        backgroundColor: isDragging ? '#eff6ff' : undefined,
    };

    // Combine virtualization style with drag style
    const combinedStyle: React.CSSProperties = {
        ...virtualizationStyle,
        ...dragStyle,
        display: 'grid',
        gridTemplateColumns,
        alignItems: 'center',
    };

    const getContextInfo = () => {
        const showSuite = !activeSuiteId;
        const showArea = !activeArea && !!item.area;

        if (showSuite && showArea) return `${item.suite} | ${item.area}`;
        if (showSuite) return item.suite;
        if (showArea) return item.area;
        return '';
    };

    return (
        <div
            ref={setNodeRef}
            style={combinedStyle}
            onClick={() => {
                if (isSelectionMode) {
                    onToggleSelection?.(item.id);
                } else {
                    onRowClick(item);
                }
            }}
            className={`group transition-colors border-b border-gray-100 dark:border-gray-700 ${isEditMode ? '' : 'cursor-pointer'} ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/50'} ${isDragging ? 'shadow-lg' : ''}`}
        >
            {enableReorder && (
                <div className="py-2 pl-3 pr-1 flex items-center">
                    <div
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing touch-none"
                        title="Drag to reorder"
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                </div>
            )}
            {isSelectionMode && (
                <div className="py-2 pl-6 pr-2 flex items-center justify-center">
                    <div onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection?.(item.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}
            {/* ID Column */}
            {!hiddenColumns.id && (
                <div className={`py-2 ${isSelectionMode ? 'pl-2' : enableReorder ? 'pl-2' : 'pl-6'} pr-4 text-sm font-medium text-gray-500 dark:text-gray-400 font-mono tracking-tight group-hover:text-gray-900 dark:group-hover:text-gray-200 truncate`}>
                    <IdDisplay id={item.id} />
                </div>
            )}

            {/* Title Cell: Editable or Text */}
            {!hiddenColumns.title && (
                <div className="py-2 px-4 min-w-0">
                    {isEditMode ? (
                        <div onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={item.title}
                                onChange={(e) => onUpdate?.(item.id, 'title', e.target.value)}
                                className="w-full bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 outline-none"
                            />
                            {getContextInfo() && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                                    {getContextInfo()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="text-[15px] font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</div>
                            {getContextInfo() && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                    {getContextInfo()}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Priority: Editable or Badge */}
            {!hiddenColumns.priority && (
                <div className="py-2 px-4">
                    {isEditMode ? (
                        <div onClick={(e) => e.stopPropagation()}>
                            <select
                                value={item.priority}
                                onChange={(e) => onUpdate?.(item.id, 'priority', e.target.value)}
                                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-blue-300 dark:focus:border-blue-500"
                            >
                                {Object.values(Priority).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <StatusBadge type="priority" value={item.priority} />
                    )}
                </div>
            )}

            {/* Unified Status Dropdown */}
            {!hiddenColumns.status && (
                <div className="py-2 px-4">
                    <div onClick={e => e.stopPropagation()}>
                        <select
                            value={item.status}
                            onChange={(e) => onStatusChange?.(item.id, e.target.value as Status)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border appearance-none cursor-pointer outline-none transition-colors text-center min-w-[90px] ${getStatusColor(item.status)}`}
                        >
                            <option value={Status.Draft}>Draft</option>
                            <option value={Status.Passed}>Passed</option>
                            <option value={Status.Failed}>Failed</option>
                            <option value={Status.PassFixed}>Pass - Fixed</option>
                            <option value={Status.Retest}>Retest</option>
                            <option value={Status.Skipped}>Skipped</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Last Modified */}
            {!hiddenColumns.lastModified && (
                <div className="py-2 px-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(item.lastModified).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(item.lastModified).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </div>
                </div>
            )}

            {/* Assignee */}
            {!hiddenColumns.assignedTester && (
                <div className="py-2 px-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{item.assignedTester.name}</span>
                        <img
                            src={item.assignedTester.avatar}
                            alt={item.assignedTester.name}
                            className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-600"
                        />
                    </div>
                </div>
            )}

            {/* Custom Field Columns */}
            {visibleCustomFieldIds.map((fieldId) => {
                const fieldDef = customFieldDefinitions.find(f => f.id === fieldId);
                if (!fieldDef) return null;

                const value = item.customFields?.[fieldId] || '';

                // For dropdown fields, look up the display label from the option ID
                let displayValue = value;
                if (fieldDef.type === 'dropdown' && value && fieldDef.options) {
                    const selectedOption = fieldDef.options.find(opt => opt.id === value);
                    displayValue = selectedOption?.label || value;
                }

                return (
                    <div key={fieldId} className="py-2 px-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{displayValue || '-'}</div>
                    </div>
                );
            })}

            {/* Actions Column */}
            <div className="py-2 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloneClick?.(item);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Clone Test Case"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        Clone
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewClick?.(item);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        title="Edit Test Case"
                    >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
};

// VirtualizedTable component that uses react-window
interface VirtualizedTableProps {
    data: TestCase[];
    selectedIds: string[];
    isSelectionMode: boolean;
    isEditMode: boolean;
    enableReorder: boolean;
    onRowClick: (item: TestCase) => void;
    onToggleSelection?: (id: string) => void;
    onSelectAll?: (selectAll: boolean) => void;
    onStatusChange?: (caseId: string, status: Status) => void;
    onViewClick?: (item: TestCase) => void;
    onCloneClick?: (item: TestCase) => void;
    onUpdate?: (id: string, field: keyof TestCase, value: string | number | boolean | Status | Priority) => void;
    getStatusColor: (status: Status) => string;
    customFieldDefinitions?: CustomFieldDefinition[];
    visibleCustomFieldIds?: string[];
    hiddenColumns?: HiddenDefaultColumns;
    handleColumnSort: (field: SortField) => void;
    SortIcon: React.FC<{ field: SortField }>;
    allSelected: boolean;
    someSelected: boolean;
    activeArea?: string | null;
    activeSuiteId?: string | null;
}

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
    data,
    selectedIds,
    isSelectionMode,
    isEditMode,
    enableReorder,
    onRowClick,
    onToggleSelection,
    onSelectAll,
    onStatusChange,
    onViewClick,
    onCloneClick,
    onUpdate,
    getStatusColor,
    customFieldDefinitions = [],
    visibleCustomFieldIds = [],
    hiddenColumns = {},
    handleColumnSort,
    SortIcon,
    allSelected,
    someSelected,
    activeArea,
    activeSuiteId,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(400);

    // Calculate container height on mount and resize
    React.useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                // Account for the header height (approx 40px)
                setContainerHeight(Math.max(200, rect.height - 40));
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Build grid template columns dynamically based on visible columns
    const gridTemplateColumns = useMemo(() => {
        const columns: string[] = [];
        
        if (enableReorder) columns.push('40px'); // Drag handle
        if (isSelectionMode) columns.push('48px'); // Checkbox
        if (!hiddenColumns.id) columns.push('120px'); // ID
        if (!hiddenColumns.title) columns.push('1fr'); // Title (flexible)
        if (!hiddenColumns.priority) columns.push('100px'); // Priority
        if (!hiddenColumns.status) columns.push('120px'); // Status
        if (!hiddenColumns.lastModified) columns.push('130px'); // Last Modified
        if (!hiddenColumns.assignedTester) columns.push('140px'); // Assignee
        
        // Custom field columns
        visibleCustomFieldIds.forEach(() => {
            columns.push('120px');
        });
        
        columns.push('140px'); // Actions
        
        return columns.join(' ');
    }, [enableReorder, isSelectionMode, hiddenColumns, visibleCustomFieldIds]);

    // Row component for react-window v2
    const VirtualRow = useCallback(({ index, style }: RowComponentProps<VirtualRowProps>) => {
        const item = data[index];
        if (!item) return null;
        
        return (
            <SortableRow
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                isSelectionMode={isSelectionMode}
                isEditMode={isEditMode}
                enableReorder={enableReorder}
                onRowClick={onRowClick}
                onToggleSelection={onToggleSelection}
                onStatusChange={onStatusChange}
                onViewClick={onViewClick}
                onCloneClick={onCloneClick}
                onUpdate={onUpdate}
                getStatusColor={getStatusColor}
                customFieldDefinitions={customFieldDefinitions}
                visibleCustomFieldIds={visibleCustomFieldIds}
                hiddenColumns={hiddenColumns}
                activeArea={activeArea}
                activeSuiteId={activeSuiteId}
                style={style}
                gridTemplateColumns={gridTemplateColumns}
            />
        );
    }, [data, selectedIds, isSelectionMode, isEditMode, enableReorder, onRowClick, onToggleSelection, onStatusChange, onViewClick, onCloneClick, onUpdate, getStatusColor, customFieldDefinitions, visibleCustomFieldIds, hiddenColumns, activeArea, activeSuiteId, gridTemplateColumns]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                <p>No test cases found</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div 
                className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none"
                style={{ display: 'grid', gridTemplateColumns, alignItems: 'center' }}
            >
                {enableReorder && (
                    <div className="py-2 pl-2 pr-0"></div>
                )}
                {isSelectionMode && (
                    <div className="py-2 pl-6 pr-2 flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            ref={input => {
                                if (input) {
                                    input.indeterminate = someSelected && !allSelected;
                                }
                            }}
                            onChange={(e) => onSelectAll?.(e.target.checked)}
                            className="w-4 h-4 text-system-blue border-gray-300 dark:border-gray-600 rounded focus:ring-system-blue bg-white dark:bg-gray-800"
                        />
                    </div>
                )}
                {/* ID Header */}
                {!hiddenColumns?.id && (
                    <div className={`py-2 ${isSelectionMode ? 'pl-2' : enableReorder ? 'pl-2' : 'pl-6'} pr-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider`}>ID</div>
                )}

                {/* Title Header */}
                {!hiddenColumns?.title && (
                    <div
                        className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        onClick={() => handleColumnSort('title')}
                    >
                        <div className="flex items-center gap-1.5">
                            Title
                            <SortIcon field="title" />
                        </div>
                    </div>
                )}

                {/* Priority Header */}
                {!hiddenColumns?.priority && (
                    <div
                        className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        onClick={() => handleColumnSort('priority')}
                    >
                        <div className="flex items-center gap-1.5">
                            Priority
                            <SortIcon field="priority" />
                        </div>
                    </div>
                )}

                {/* Status Header */}
                {!hiddenColumns?.status && (
                    <div
                        className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        onClick={() => handleColumnSort('status')}
                    >
                        <div className="flex items-center gap-1.5">
                            Status
                            <SortIcon field="status" />
                        </div>
                    </div>
                )}

                {/* Last Modified Header */}
                {!hiddenColumns?.lastModified && (
                    <div
                        className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        onClick={() => handleColumnSort('lastModified')}
                    >
                        <div className="flex items-center gap-1.5">
                            Last Modified
                            <SortIcon field="lastModified" />
                        </div>
                    </div>
                )}

                {/* Assignee Header */}
                {!hiddenColumns?.assignedTester && (
                    <div
                        className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right pr-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        onClick={() => handleColumnSort('assignedTester')}
                    >
                        <div className="flex items-center justify-end gap-1.5">
                            Assignee
                            <SortIcon field="assignedTester" />
                        </div>
                    </div>
                )}

                {/* Custom Field Headers */}
                {visibleCustomFieldIds?.map((fieldId) => {
                    const fieldDef = customFieldDefinitions?.find(f => f.id === fieldId);
                    if (!fieldDef) return null;

                    return (
                        <div
                            key={fieldId}
                            className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                        >
                            {fieldDef.label}
                        </div>
                    );
                })}

                {/* Actions Header */}
                <div className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"></div>
            </div>

            {/* Virtualized List */}
            <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
                <SortableContext
                    items={data.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <List<VirtualRowProps>
                        defaultHeight={containerHeight}
                        rowComponent={VirtualRow}
                        rowCount={data.length}
                        rowHeight={ROW_HEIGHT}
                        rowProps={{
                            items: data,
                            selectedIds,
                            isSelectionMode,
                            isEditMode,
                            enableReorder,
                            onRowClick,
                            onToggleSelection,
                            onStatusChange,
                            onViewClick,
                            onCloneClick,
                            onUpdate,
                            getStatusColor,
                            customFieldDefinitions,
                            visibleCustomFieldIds,
                            hiddenColumns,
                            activeArea,
                            activeSuiteId,
                            gridTemplateColumns,
                        }}
                        overscanCount={5}
                        style={{ height: containerHeight }}
                    />
                </SortableContext>
            </div>
        </div>
    );
};

const TestCaseTable: React.FC<TestCaseTableProps> = ({
    data,
    onRowClick,
    onStatusChange,
    onViewClick,
    onCloneClick,
    isEditMode = false,
    onUpdate,
    isSelectionMode = false,
    selectedIds = [],
    onToggleSelection,
    onSelectAll,
    enableReorder = false,
    onReorder,
    customFieldDefinitions = [],
    visibleCustomFieldIds = [],
    hiddenColumns = {},
    showSortControlsInHeader = false,
    onSortInfoChange,
    activeArea,
    activeSuiteId,
}) => {
    // Sorting state
    const [sortMode, setSortMode] = useState<'custom' | 'standard'>('custom');
    const [sortField, setSortField] = useState<SortField>('title');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    const resetToCustomOrder = () => {
        setSortMode('custom');
    };

    // Notify parent of sorting state changes
    React.useEffect(() => {
        if (onSortInfoChange && enableReorder) {
            onSortInfoChange({
                sortMode,
                sortField,
                sortOrder,
                resetToCustomOrder,
            });
        }
    }, [sortMode, sortField, sortOrder, enableReorder, onSortInfoChange]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const getStatusColor = (status: Status) => {
        switch (status) {
            case Status.Passed: return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
            case Status.PassFixed: return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700';
            case Status.Failed: return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700';
            case Status.Retest: return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
            case Status.Skipped: return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-600';
            case Status.Draft: return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-transparent dark:border-gray-600';
        }
    };

    const getPriorityValue = (priority: Priority): number => {
        switch (priority) {
            case Priority.Critical: return 4;
            case Priority.High: return 3;
            case Priority.Medium: return 2;
            case Priority.Low: return 1;
            default: return 0;
        }
    };

    // Sort data based on current mode and settings
    const sortedData = useMemo(() => {
        if (sortMode === 'custom') {
            return [...data];
        }

        return [...data].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'priority':
                    comparison = getPriorityValue(a.priority) - getPriorityValue(b.priority);
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                case 'lastModified':
                    comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
                    break;
                case 'assignedTester':
                    comparison = a.assignedTester.name.localeCompare(b.assignedTester.name);
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [data, sortMode, sortField, sortOrder]);

    const handleColumnSort = (field: SortField) => {
        if (sortMode === 'custom') {
            setSortMode('standard');
            setSortField(field);
            setSortOrder('asc');
        } else if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const allSelected = sortedData.length > 0 && sortedData.every(item => selectedIds.includes(item.id));
    const someSelected = sortedData.some(item => selectedIds.includes(item.id));

    const getContextInfo = (item: TestCase) => {
        const showSuite = !activeSuiteId;
        const showArea = !activeArea && !!item.area;

        if (showSuite && showArea) return `${item.suite} | ${item.area}`;
        if (showSuite) return item.suite;
        if (showArea) return item.area;
        return '';
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = sortedData.findIndex((item) => item.id === active.id);
            const newIndex = sortedData.findIndex((item) => item.id === over.id);
            const newData = arrayMove(sortedData, oldIndex, newIndex);

            // Update order values
            const reorderedData = newData.map((item, index) => ({
                ...item,
                order: index,
            }));

            onReorder?.(reorderedData);
        }
    };

    const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
        if (sortMode === 'custom' || sortField !== field) {
            return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />;
        }
        return sortOrder === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            : <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
    };

    return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Sort Controls Bar - Show on mobile, hide on desktop if showSortControlsInHeader */}
            {enableReorder && (
                <div className={`flex items-center justify-between px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${showSortControlsInHeader ? 'sm:hidden' : ''}`}>
                    <div className="flex items-center gap-2">
                        {sortMode === 'custom' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
                                <GripVertical className="h-3 w-3" />
                                Custom Order
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
                                {sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                Sorted by {sortField.charAt(0).toUpperCase() + sortField.slice(1)}
                            </span>
                        )}
                    </div>
                    {sortMode === 'standard' && (
                        <button
                            onClick={resetToCustomOrder}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset to Custom Order
                        </button>
                    )}
                </div>
            )}

            {/* Desktop virtualized table */}
            <div className="hidden sm:flex sm:flex-col overflow-hidden flex-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <VirtualizedTable
                        data={sortedData}
                        selectedIds={selectedIds}
                        isSelectionMode={isSelectionMode}
                        isEditMode={isEditMode}
                        enableReorder={enableReorder && sortMode === 'custom'}
                        onRowClick={onRowClick}
                        onToggleSelection={onToggleSelection}
                        onSelectAll={onSelectAll}
                        onStatusChange={onStatusChange}
                        onViewClick={onViewClick}
                        onCloneClick={onCloneClick}
                        onUpdate={onUpdate}
                        getStatusColor={getStatusColor}
                        customFieldDefinitions={customFieldDefinitions}
                        visibleCustomFieldIds={visibleCustomFieldIds}
                        hiddenColumns={hiddenColumns}
                        handleColumnSort={handleColumnSort}
                        SortIcon={SortIcon}
                        allSelected={allSelected}
                        someSelected={someSelected}
                        activeArea={activeArea}
                        activeSuiteId={activeSuiteId}
                    />
                </DndContext>
            </div>

            {/* Mobile list */}
            <div className="block sm:hidden p-2 flex-1 overflow-auto">
                {sortedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                        <p>No test cases found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedData.map(item => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        onToggleSelection?.(item.id);
                                    } else {
                                        onRowClick(item);
                                    }
                                }}
                                className={`relative mac-card overflow-hidden cursor-pointer transition-all active:scale-[0.98] ${selectedIds.includes(item.id)
                                    ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                                    : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/80'
                                    }`}
                            >
                                {/* Priority Color Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.priority === Priority.Critical ? 'bg-red-500' :
                                    item.priority === Priority.High ? 'bg-orange-500' :
                                        item.priority === Priority.Medium ? 'bg-yellow-500' :
                                            item.priority === Priority.Low ? 'bg-blue-500' : 'bg-gray-400'
                                    }`} />

                                <div className="p-4 pl-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Top Row: Status & ID */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <StatusBadge type="status" value={item.status} />
                                                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                    #{item.id.slice(-6)}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h4 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                                                {item.title}
                                            </h4>

                                            {/* Context Info (Suite/Area) */}
                                            {getContextInfo(item) && (
                                                <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {getContextInfo(item)}
                                                </div>
                                            )}

                                            {/* Footer: User & Date */}
                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={item.assignedTester.avatar}
                                                        alt={item.assignedTester.name}
                                                        className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-700"
                                                    />
                                                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                        {item.assignedTester.name}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-tight">
                                                    {new Date(item.lastModified).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Selection Checkbox or Chevron */}
                                        <div className="flex flex-col items-center justify-center pt-0.5">
                                            {isSelectionMode ? (
                                                <div className="p-1" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => onToggleSelection?.(item.id)}
                                                        className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded-full focus:ring-blue-500 bg-white dark:bg-gray-700"
                                                    />
                                                </div>
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestCaseTable;
