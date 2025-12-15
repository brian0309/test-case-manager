
import React, { useState, useMemo } from 'react';
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
import { TestCase, Priority, Status, CustomFieldDefinition, HiddenDefaultColumns } from '../../types/testManager';
import StatusBadge from './StatusBadge';
import { Edit, Copy, Check, GripVertical, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

type SortField = 'title' | 'priority' | 'status' | 'lastModified' | 'assignedTester';
type SortOrder = 'asc' | 'desc';

interface TestCaseTableProps {
    data: TestCase[];
    onRowClick: (item: TestCase) => void;
    onStatusChange?: (caseId: string, status: Status) => void;
    onViewClick?: (item: TestCase) => void;
    isEditMode?: boolean;
    onUpdate?: (id: string, field: keyof TestCase, value: any) => void;
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
}

const IdCell: React.FC<{ id: string }> = ({ id }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Show last 10 chars, prefixed with ellipsis if longer
    const displayId = id.length > 6 ? '..' + id.slice(-6) : id;

    return (
        <div className="flex items-center gap-2 group/id relative">
            <span title={id}>{displayId}</span>
            <button
                onClick={handleCopy}
                className={`p-1 rounded transition-all ${copied
                    ? 'text-green-600 bg-green-50 opacity-100'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover/id:opacity-100'
                    }`}
                title="Copy ID"
            >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
        </div>
    );
};

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
    onUpdate?: (id: string, field: keyof TestCase, value: any) => void;
    getStatusColor: (status: Status) => string;
    // Custom fields and visibility
    customFieldDefinitions?: CustomFieldDefinition[];
    visibleCustomFieldIds?: string[];
    hiddenColumns?: HiddenDefaultColumns;
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
    onUpdate,
    getStatusColor,
    customFieldDefinitions = [],
    visibleCustomFieldIds = [],
    hiddenColumns = {},
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

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : undefined,
        position: isDragging ? 'relative' : undefined,
        backgroundColor: isDragging ? '#eff6ff' : undefined,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            onClick={() => {
                if (isSelectionMode) {
                    onToggleSelection?.(item.id);
                } else {
                    onRowClick(item);
                }
            }}
            className={`group transition-colors ${isEditMode ? '' : 'cursor-pointer'} ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/80'} ${isDragging ? 'shadow-lg' : ''}`}
        >
            {enableReorder && (
                <td className="py-4 pl-3 pr-1 w-10">
                    <div
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing touch-none"
                        title="Drag to reorder"
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                </td>
            )}
            {isSelectionMode && (
                <td className="py-4 pl-6 pr-2">
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection?.(item.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                </td>
            )}
            {/* ID Column */}
            {!hiddenColumns.id && (
                <td className={`py-4 ${isSelectionMode ? 'pl-2' : enableReorder ? 'pl-2' : 'pl-6'} pr-4 text-sm font-medium text-gray-500 font-mono tracking-tight group-hover:text-gray-900`}>
                    <IdCell id={item.id} />
                </td>
            )}

            {/* Title Cell: Editable or Text */}
            {!hiddenColumns.title && (
                <td className="py-4 px-4">
                    {isEditMode ? (
                        <div onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={item.title}
                                onChange={(e) => onUpdate?.(item.id, 'title', e.target.value)}
                                className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none"
                            />
                            <div className="text-xs text-gray-400 mt-1">{item.suite}</div>
                        </div>
                    ) : (
                        <>
                            <div className="text-[15px] font-medium text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{item.suite}</div>
                        </>
                    )}
                </td>
            )}

            {/* Priority: Editable or Badge */}
            {!hiddenColumns.priority && (
                <td className="py-4 px-4">
                    {isEditMode ? (
                        <div onClick={(e) => e.stopPropagation()}>
                            <select
                                value={item.priority}
                                onChange={(e) => onUpdate?.(item.id, 'priority', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-300"
                            >
                                {Object.values(Priority).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <StatusBadge type="priority" value={item.priority} />
                    )}
                </td>
            )}

            {/* Unified Status Dropdown */}
            {!hiddenColumns.status && (
                <td className="py-4 px-4">
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
                </td>
            )}

            {/* Last Modified */}
            {!hiddenColumns.lastModified && (
                <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">
                        {new Date(item.lastModified).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.lastModified).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </div>
                </td>
            )}

            {/* Assignee */}
            {!hiddenColumns.assignedTester && (
                <td className="py-4 px-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-600 truncate max-w-[100px]">{item.assignedTester.name}</span>
                        <img
                            src={item.assignedTester.avatar}
                            alt={item.assignedTester.name}
                            className="h-6 w-6 rounded-full border border-gray-200"
                        />
                    </div>
                </td>
            )}

            {/* Custom Field Columns */}
            {visibleCustomFieldIds.map((fieldId) => {
                const fieldDef = customFieldDefinitions.find(f => f.id === fieldId);
                if (!fieldDef) return null;
                
                const value = item.customFields?.[fieldId] || '';
                
                return (
                    <td key={fieldId} className="py-4 px-4">
                        <div className="text-sm text-gray-900">{value || '-'}</div>
                    </td>
                );
            })}

            {/* Actions Column */}
            <td className="py-4 px-4 text-center">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewClick?.(item);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit Test Case"
                >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                </button>
            </td>
        </tr>
    );
};

const TestCaseTable: React.FC<TestCaseTableProps> = ({
    data,
    onRowClick,
    onStatusChange,
    onViewClick,
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
}) => {
    // Sorting state
    const [sortMode, setSortMode] = useState<'custom' | 'standard'>('custom');
    const [sortField, setSortField] = useState<SortField>('title');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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
            case Status.Passed: return 'bg-green-100 text-green-700 border-green-200';
            case Status.PassFixed: return 'bg-teal-100 text-teal-700 border-teal-200';
            case Status.Failed: return 'bg-red-100 text-red-700 border-red-200';
            case Status.Retest: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case Status.Skipped: return 'bg-gray-50 text-gray-400 border-gray-200';
            case Status.Draft: return 'bg-gray-50 text-gray-500 border-gray-200';
            default: return 'bg-gray-50 text-gray-400 border-transparent';
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

    const resetToCustomOrder = () => {
        setSortMode('custom');
    };

    const allSelected = sortedData.length > 0 && sortedData.every(item => selectedIds.includes(item.id));
    const someSelected = sortedData.some(item => selectedIds.includes(item.id));

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
            return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
        }
        return sortOrder === 'asc' 
            ? <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
            : <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
    };

    return (
        <div className="flex-1 bg-white flex flex-col">
            {/* Sort Controls Bar */}
            {enableReorder && (
                <div className="flex items-center justify-between px-6 py-2 border-b border-gray-200 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        {sortMode === 'custom' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full border border-blue-200">
                                <GripVertical className="h-3 w-3" />
                                Custom Order
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-full border border-purple-200">
                                {sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                Sorted by {sortField.charAt(0).toUpperCase() + sortField.slice(1)}
                            </span>
                        )}
                    </div>
                    {sortMode === 'standard' && (
                        <button
                            onClick={resetToCustomOrder}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-md border border-gray-300 transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset to Custom Order
                        </button>
                    )}
                </div>
            )}

            {/* Desktop table */}
            <div className="hidden sm:block overflow-auto flex-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <tr>
                                {enableReorder && sortMode === 'custom' && (
                                    <th className="py-3 pl-2 pr-0 w-8"></th>
                                )}
                                {isSelectionMode && (
                                    <th className="py-3 pl-6 pr-2 w-10">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={input => {
                                                    if (input) {
                                                        input.indeterminate = someSelected && !allSelected;
                                                    }
                                                }}
                                                onChange={(e) => onSelectAll?.(e.target.checked)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                    </th>
                                )}
                                {/* ID Header */}
                                {!hiddenColumns?.id && (
                                    <th className={`py-3 ${isSelectionMode ? 'pl-2' : (enableReorder && sortMode === 'custom') ? 'pl-2' : 'pl-6'} pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32`}>ID</th>
                                )}
                                
                                {/* Title Header */}
                                {!hiddenColumns?.title && (
                                    <th 
                                        className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3 cursor-pointer hover:bg-gray-50 select-none"
                                        onClick={() => handleColumnSort('title')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Title
                                            <SortIcon field="title" />
                                        </div>
                                    </th>
                                )}
                                
                                {/* Priority Header */}
                                {!hiddenColumns?.priority && (
                                    <th 
                                        className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32 cursor-pointer hover:bg-gray-50 select-none"
                                        onClick={() => handleColumnSort('priority')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Priority
                                            <SortIcon field="priority" />
                                        </div>
                                    </th>
                                )}
                                
                                {/* Status Header */}
                                {!hiddenColumns?.status && (
                                    <th 
                                        className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-40 cursor-pointer hover:bg-gray-50 select-none"
                                        onClick={() => handleColumnSort('status')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Status
                                            <SortIcon field="status" />
                                        </div>
                                    </th>
                                )}
                                
                                {/* Last Modified Header */}
                                {!hiddenColumns?.lastModified && (
                                    <th 
                                        className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-40 cursor-pointer hover:bg-gray-50 select-none"
                                        onClick={() => handleColumnSort('lastModified')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Last Modified
                                            <SortIcon field="lastModified" />
                                        </div>
                                    </th>
                                )}
                                
                                {/* Assignee Header */}
                                {!hiddenColumns?.assignedTester && (
                                    <th 
                                        className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32 text-right pr-6 cursor-pointer hover:bg-gray-50 select-none"
                                        onClick={() => handleColumnSort('assignedTester')}
                                    >
                                        <div className="flex items-center justify-end gap-1.5">
                                            Assignee
                                            <SortIcon field="assignedTester" />
                                        </div>
                                    </th>
                                )}
                                
                                {/* Custom Field Headers */}
                                {visibleCustomFieldIds?.map((fieldId) => {
                                    const fieldDef = customFieldDefinitions?.find(f => f.id === fieldId);
                                    if (!fieldDef) return null;
                                    
                                    return (
                                        <th 
                                            key={fieldId}
                                            className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32"
                                        >
                                            {fieldDef.label}
                                        </th>
                                    );
                                })}
                                
                                {/* Actions Header */}
                                <th className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <SortableContext
                                items={sortedData.map((item) => item.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {sortedData.map((item) => (
                                    <SortableRow
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedIds.includes(item.id)}
                                        isSelectionMode={isSelectionMode}
                                        isEditMode={isEditMode}
                                        enableReorder={enableReorder && sortMode === 'custom'}
                                        onRowClick={onRowClick}
                                        onToggleSelection={onToggleSelection}
                                        onStatusChange={onStatusChange}
                                        onViewClick={onViewClick}
                                        onUpdate={onUpdate}
                                        getStatusColor={getStatusColor}
                                        customFieldDefinitions={customFieldDefinitions}
                                        visibleCustomFieldIds={visibleCustomFieldIds}
                                        hiddenColumns={hiddenColumns}
                                    />
                                ))}
                            </SortableContext>
                        </tbody>
                    </table>
                </DndContext>
            </div>

            {/* Mobile list */}
            <div className="block sm:hidden p-2 flex-1 overflow-auto">
                {sortedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
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
                                className={`mac-card p-3 flex flex-col gap-2 cursor-pointer transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/50 border-blue-200' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-start gap-3">
                                    {isSelectionMode && (
                                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => onToggleSelection?.(item.id)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                                <div className="text-xs text-gray-400 mt-1 truncate">{item.suite}</div>
                                            </div>
                                            <div className="ml-3 flex-shrink-0">
                                                <StatusBadge type="priority" value={item.priority} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <div className="text-xs font-mono text-gray-500 break-words max-w-[40%]">{item.id}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600 truncate max-w-[120px]">{item.assignedTester.name}</span>
                                                <img src={item.assignedTester.avatar} alt={item.assignedTester.name} className="h-6 w-6 rounded-full border border-gray-200" />
                                                {!isSelectionMode && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onViewClick?.(item); }}
                                                        className="ml-2 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                )}
                                            </div>
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
