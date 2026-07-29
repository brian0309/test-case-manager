import React, { useState, useMemo } from 'react';
import {
    Layers,
    FolderOpen,
    FolderPlus,
    Edit2,
    Trash2,
    X,
    Folder,
    ChevronRight,
    ChevronDown,
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

interface TreeNode {
    group: TestRunGroup;
    children: TreeNode[];
    depth: number;
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
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const rootGroups = useMemo(() => {
        const childrenMap = new Map<string, TestRunGroup[]>();
        const roots: TestRunGroup[] = [];

        for (const group of groups) {
            if (group.parentId) {
                const siblings = childrenMap.get(group.parentId) || [];
                siblings.push(group);
                childrenMap.set(group.parentId, siblings);
            } else {
                roots.push(group);
            }
        }

        const buildTree = (parentGroups: TestRunGroup[], depth: number): TreeNode[] => {
            const nodes: TreeNode[] = [];
            for (const group of parentGroups) {
                const children = buildTree(childrenMap.get(group.id) || [], depth + 1);
                nodes.push({ group, children, depth });
            }
            return nodes;
        };

        return buildTree(roots, 0);
    }, [groups]);

    const toggleFolder = (groupId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleGroupClick = (groupId: string) => {
        onSelectFilter(groupId);
        if (isMobile && onClose) onClose();
    };

    const renderTree = (nodes: TreeNode[]) => {
        return nodes.map(({ group, children, depth }) => {
            const isFolder = children.length > 0;
            const isExpanded = expandedFolders.has(group.id);
            const isSelected = selectedFilter === group.id;

            return (
                <div key={group.id}>
                    <div
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                            isSelected
                                ? 'bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        style={{ paddingLeft: `${12 + depth * 20}px` }}
                    >
                        <button
                            onClick={() => handleGroupClick(group.id)}
                            className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
                        >
                            {isFolder ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFolder(group.id);
                                    }}
                                    className="p-0.5 -ml-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                >
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                            ) : (
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${group.color || 'bg-gray-400'}`} />
                            )}
                            {isFolder && (
                                <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                            )}
                            <span
                                className={`text-sm font-medium truncate ${
                                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {group.name}
                            </span>
                        </button>

                        <div className={`flex items-center gap-1 ${
                            isMobile
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'
                        } transition-opacity flex-shrink-0`}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditGroup(group);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Edit Group"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteGroup(group.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Delete Group"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    {isFolder && isExpanded && renderTree(children)}
                </div>
            );
        });
    };

    return (
        <div className={`
            flex flex-col bg-gray-50 dark:bg-gray-900
            ${isMobile 
                ? 'w-full h-full' 
                : 'w-64 h-full border-r border-gray-100 dark:border-gray-700'
            }
        `}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Run Groups
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onCreateGroup}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="New Group"
                    >
                        <FolderPlus className="w-4 h-4" />
                    </button>
                    {isMobile && onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors md:hidden"
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
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Ungrouped</span>
                </button>

                {/* Divider */}
                {groups.length > 0 && (
                    <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
                )}

                {/* Tree */}
                {renderTree(rootGroups)}

                {/* Empty State for Groups */}
                {groups.length === 0 && (
                    <div className="px-3 py-4 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            No groups yet. Create one to organize your test runs.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RunGroupsSidebar;