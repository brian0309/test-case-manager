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
            dateRange: { start: null, end: null }
        });
    };

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">Filter Test Cases</h2>
                    <button
                        onClick={() => toggleFilterModal(false)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Status Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 block">Status</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(Status).map(status => {
                                const isSelected = localFilters.status.includes(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusToggle(status)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                                                ? 'ring-2 ring-offset-1 ring-blue-500 ' + getStatusColor(status)
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                        <label className="text-sm font-medium text-gray-700 block">Priority</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(Priority).map(priority => {
                                const isSelected = localFilters.priority.includes(priority);
                                let colorClass = '';
                                switch (priority) {
                                    case Priority.High: colorClass = isSelected ? 'bg-red-100 text-red-700 border-red-200 ring-red-500' : ''; break;
                                    case Priority.Medium: colorClass = isSelected ? 'bg-amber-100 text-amber-700 border-amber-200 ring-amber-500' : ''; break;
                                    case Priority.Low: colorClass = isSelected ? 'bg-blue-100 text-blue-700 border-blue-200 ring-blue-500' : ''; break;
                                }

                                return (
                                    <button
                                        key={priority}
                                        onClick={() => handlePriorityToggle(priority)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                                                ? 'ring-2 ring-offset-1 ' + colorClass
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                        <label className="text-sm font-medium text-gray-700 block">Last Modified</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500">From</span>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="date"
                                        value={localFilters.dateRange.start || ''}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500">To</span>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="date"
                                        value={localFilters.dateRange.end || ''}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded-md hover:bg-gray-200/50"
                    >
                        <RotateCcw size={14} />
                        Reset Defaults
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => toggleFilterModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all"
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
