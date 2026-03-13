import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, RotateCcw } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';
import { Status, Priority } from '../../types/testManager';

const FilterModal: React.FC = () => {
    const {
        isFilterModalOpen,
        toggleFilterModal,
        filters,
        setFilters,
        setActiveArea,
    } = useTestManagerStore();

    const [localFilters, setLocalFilters] = useState(filters);

    // Sync local state with store when modal opens
    useEffect(() => {
        if (isFilterModalOpen) {
            setLocalFilters(filters);
        }
    }, [isFilterModalOpen, filters]);

    if (!isFilterModalOpen) return null;

    const handleStatusToggle = (status: Status) => {
        setLocalFilters(prev => {
            const newStatuses = prev.status.includes(status)
                ? prev.status.filter(s => s !== status)
                : [...prev.status, status];
            return { ...prev, status: newStatuses };
        });
    };

    const handlePriorityToggle = (priority: Priority) => {
        setLocalFilters(prev => {
            const newPriorities = prev.priority.includes(priority)
                ? prev.priority.filter(p => p !== priority)
                : [...prev.priority, priority];
            return { ...prev, priority: newPriorities };
        });
    };

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        setLocalFilters(prev => ({
            ...prev,
            dateRange: {
                ...prev.dateRange,
                [type]: value || null
            }
        }));
    };

    const handleCreatedAtChange = (type: 'start' | 'end', value: string) => {
        setLocalFilters(prev => ({
            ...prev,
            createdAtRange: {
                ...(prev.createdAtRange || { start: null, end: null }),
                [type]: value || null
            }
        }));
    };

    const handleApply = () => {
        setFilters(localFilters);
        if (localFilters.status.length > 0) {
            setActiveArea(null);
        }
        toggleFilterModal(false);
    };

    const handleReset = () => {
        setLocalFilters({
            status: [],
            priority: [],
            dateRange: { start: null, end: null },
            createdAtRange: { start: null, end: null }
        });
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case Status.Passed: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
            case Status.PassFixed: return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800';
            case Status.Failed: return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
            case Status.Retest: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            case Status.Skipped: return 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700';
            case Status.Draft: return 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700';
            case Status.ReadyForTesting: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case Status.InProgress: return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
            case Status.Blocked: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
            case Status.OutOfScope: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
            default: return 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-transparent dark:border-gray-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => toggleFilterModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter Test Cases</h2>
                    <button
                        onClick={() => toggleFilterModal(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Status Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Status</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(Status).map(status => {
                                const isSelected = localFilters.status.includes(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusToggle(status)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                                                ? 'ring-2 ring-offset-1 ring-blue-500 ' + getStatusColor(status)
                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Priority</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(Priority).map(priority => {
                                const isSelected = localFilters.priority.includes(priority);
                                let colorClass = '';
                                switch (priority) {
                                    case Priority.High: colorClass = isSelected ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 ring-red-500' : ''; break;
                                    case Priority.Medium: colorClass = isSelected ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 ring-amber-500' : ''; break;
                                    case Priority.Low: colorClass = isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 ring-blue-500' : ''; break;
                                }

                                return (
                                    <button
                                        key={priority}
                                        onClick={() => handlePriorityToggle(priority)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                                                ? 'ring-2 ring-offset-1 ' + colorClass
                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {priority}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Last Modified</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">From</span>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={14} />
                                    <input
                                        type="date"
                                        value={localFilters.dateRange.start || ''}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">To</span>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={14} />
                                    <input
                                        type="date"
                                        value={localFilters.dateRange.end || ''}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Created Date Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Created Date</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">From</span>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={14} />
                                    <input
                                        type="date"
                                        value={localFilters.createdAtRange?.start || ''}
                                        onChange={(e) => handleCreatedAtChange('start', e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">To</span>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={14} />
                                    <input
                                        type="date"
                                        value={localFilters.createdAtRange?.end || ''}
                                        onChange={(e) => handleCreatedAtChange('end', e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <RotateCcw size={14} />
                        Reset Defaults
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => toggleFilterModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm transition-all"
                        >
                            <Check size={16} />
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterModal;
