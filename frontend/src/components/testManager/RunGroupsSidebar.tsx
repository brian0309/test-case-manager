import React from 'react';
import {
    Layers,
    FolderOpen,
    FolderPlus,
    Edit2,
    Trash2,
    X,
} from 'lucide-react';
import { TestRunGroup } from '../../types/testManager';

interface RunGroupsSidebarProps {
    groups: TestRunGroup[];
    selectedFilter: string;
    onSelectFilter: (filter: string) => void;
    onCreateGroup: () => void;
    onEditGroup: (group: TestRunGroup) => void;
    onDeleteGroup: (groupId: string) => void;
    isMobile?: boolean;
    onClose?: () => void;
}

const RunGroupsSidebar: React.FC<RunGroupsSidebarProps> = ({
    groups,
    selectedFilter,
    onSelectFilter,
    onCreateGroup,
    onEditGroup,
    onDeleteGroup,
    isMobile = false,
    onClose,
}) => {
    return (
        <div className={`
            flex flex-col bg-gray-50 
            ${isMobile 
                ? 'w-full h-full' 
                : 'w-64 border-r border-gray-200'
            }
        `}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Run Groups
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onCreateGroup}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="New Group"
                    >
                        <FolderPlus className="w-4 h-4" />
                    </button>
                    {isMobile && onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors md:hidden"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {/* All Runs Filter */}
                <button
                    onClick={() => {
                        onSelectFilter('all');
                        if (isMobile && onClose) onClose();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        selectedFilter === 'all'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <Layers className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">All Runs</span>
                </button>

                {/* Ungrouped Filter */}
                <button
                    onClick={() => {
                        onSelectFilter('ungrouped');
                        if (isMobile && onClose) onClose();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        selectedFilter === 'ungrouped'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Ungrouped</span>
                </button>

                {/* Divider */}
                {groups.length > 0 && (
                    <div className="my-2 border-t border-gray-200" />
                )}

                {/* Group List */}
                {groups.map((group) => (
                    <div
                        key={group.id}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                            selectedFilter === group.id
                                ? 'bg-white shadow-sm ring-1 ring-gray-200'
                                : 'hover:bg-gray-100'
                        }`}
                    >
                        <button
                            onClick={() => {
                                onSelectFilter(group.id);
                                if (isMobile && onClose) onClose();
                            }}
                            className="flex-1 flex items-center gap-2 min-w-0 text-left"
                        >
                            <div 
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${group.color || 'bg-gray-400'}`} 
                            />
                            <span 
                                className={`text-sm font-medium truncate ${
                                    selectedFilter === group.id ? 'text-blue-600' : 'text-gray-700'
                                }`}
                            >
                                {group.name}
                            </span>
                        </button>
                        
                        {/* Action Buttons - visible on hover (desktop) or always (mobile) */}
                        <div className={`flex items-center gap-1 ${
                            isMobile 
                                ? 'opacity-100' 
                                : 'opacity-0 group-hover:opacity-100'
                        } transition-opacity`}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditGroup(group);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit Group"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteGroup(group.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Group"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Empty State for Groups */}
                {groups.length === 0 && (
                    <div className="px-3 py-4 text-center">
                        <p className="text-xs text-gray-500">
                            No groups yet. Create one to organize your test runs.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RunGroupsSidebar;
