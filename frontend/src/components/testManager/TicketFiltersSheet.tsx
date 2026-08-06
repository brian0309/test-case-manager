import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { TicketStatus, TicketPriority, TicketSeverity, FailureType } from '../../types/testManager';
import {
    getTicketStatusColor,
    getTicketPriorityColor,
    getTicketSeverityColor,
    getFailureTypeColor,
} from '../../utils/ticketColors';

interface TicketFiltersSheetProps {
    isOpen: boolean;
    selectedStatus: TicketStatus[];
    selectedPriority: TicketPriority[];
    selectedSeverity: TicketSeverity[];
    selectedFailureType: FailureType | null;
    selectedTeam: string | null;
    teams: string[];
    onApply: (status: TicketStatus[], priority: TicketPriority[], severity: TicketSeverity[], failureType: FailureType | null, team: string | null) => void;
    onClose: () => void;
}

const TicketFiltersSheet: React.FC<TicketFiltersSheetProps> = ({
    isOpen,
    selectedStatus,
    selectedPriority,
    selectedSeverity,
    selectedFailureType,
    selectedTeam,
    teams,
    onApply,
    onClose,
}) => {
    const [draftStatus, setDraftStatus] = useState<TicketStatus[]>(selectedStatus);
    const [draftPriority, setDraftPriority] = useState<TicketPriority[]>(selectedPriority);
    const [draftSeverity, setDraftSeverity] = useState<TicketSeverity[]>(selectedSeverity);
    const [draftFailureType, setDraftFailureType] = useState<FailureType | null>(selectedFailureType);
    const [draftTeam, setDraftTeam] = useState<string | null>(selectedTeam);

    // Sync draft state with the applied filters whenever the sheet opens
    useEffect(() => {
        if (isOpen) {
            setDraftStatus(selectedStatus);
            setDraftPriority(selectedPriority);
            setDraftSeverity(selectedSeverity);
            setDraftFailureType(selectedFailureType);
            setDraftTeam(selectedTeam);
        }
    }, [isOpen, selectedStatus, selectedPriority, selectedSeverity, selectedFailureType, selectedTeam]);

    if (!isOpen) return null;

    const totalSelected = draftStatus.length + draftPriority.length + draftSeverity.length + (draftFailureType ? 1 : 0) + (draftTeam ? 1 : 0);

    const toggle = <T extends string>(list: T[], value: T, setter: (next: T[]) => void) => {
        setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
    };

    const handleApply = () => {
        onApply(draftStatus, draftPriority, draftSeverity, draftFailureType, draftTeam);
        onClose();
    };

    const handleReset = () => {
        setDraftStatus([]);
        setDraftPriority([]);
        setDraftSeverity([]);
        setDraftFailureType(null);
        setDraftTeam(null);
    };

    const chipClass = (isSelected: boolean, colorClass: string) =>
        `px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            isSelected
                ? `ring-2 ring-offset-1 ring-blue-500 ${colorClass}`
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Filter Tickets</h2>
                        {totalSelected > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                {totalSelected}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Close filters"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 sm:px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Status Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Status</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(TicketStatus).map((status) => {
                                const isSelected = draftStatus.includes(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => toggle(draftStatus, status, setDraftStatus)}
                                        className={chipClass(isSelected, getTicketStatusColor(status))}
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
                            {Object.values(TicketPriority).map((priority) => {
                                const isSelected = draftPriority.includes(priority);
                                return (
                                    <button
                                        key={priority}
                                        onClick={() => toggle(draftPriority, priority, setDraftPriority)}
                                        className={chipClass(isSelected, getTicketPriorityColor(priority))}
                                    >
                                        {priority}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Severity Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Severity</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(TicketSeverity).map((severity) => {
                                const isSelected = draftSeverity.includes(severity);
                                return (
                                    <button
                                        key={severity}
                                        onClick={() => toggle(draftSeverity, severity, setDraftSeverity)}
                                        className={chipClass(isSelected, getTicketSeverityColor(severity))}
                                    >
                                        {severity}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Failure Type Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Failure Type</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(FailureType).map((failureType) => {
                                const isSelected = draftFailureType === failureType;
                                return (
                                    <button
                                        key={failureType}
                                        onClick={() => setDraftFailureType(isSelected ? null : failureType)}
                                        className={chipClass(isSelected, getFailureTypeColor(failureType))}
                                    >
                                        {failureType}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Team Filter */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Team</label>
                        {teams.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">No teams on tickets yet</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {teams.map((team) => {
                                    const isSelected = draftTeam === team;
                                    return (
                                        <button
                                            key={team}
                                            onClick={() => setDraftTeam(isSelected ? null : team)}
                                            className={chipClass(isSelected, 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700')}
                                        >
                                            {team}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 sm:px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <RotateCcw size={14} />
                        Clear All
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm transition-all active:scale-95"
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

export default TicketFiltersSheet;
