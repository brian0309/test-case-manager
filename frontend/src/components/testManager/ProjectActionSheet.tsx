import React, { useEffect, useRef } from 'react';
import { Users, Pencil, Trash2, X, Settings, Share2 } from 'lucide-react';
import { Project } from '../../types/testManager';

interface ActionSheetOption {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface Props {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onManageMembers: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSettings: () => void;
    onShare: () => void;
}

const ProjectActionSheet: React.FC<Props> = ({ 
    project, 
    isOpen, 
    onClose, 
    onManageMembers, 
    onEdit, 
    onDelete,
    onSettings,
    onShare
}) => {
    const sheetRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when sheet is open
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Handle touch drag to dismiss
    useEffect(() => {
        const sheet = sheetRef.current;
        if (!sheet || !isOpen) return;

        let startY = 0;
        let currentY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                sheet.style.transform = `translateY(${diff}px)`;
            }
        };

        const handleTouchEnd = () => {
            const diff = currentY - startY;
            if (diff > 100) {
                onClose();
            }
            sheet.style.transform = '';
            startY = 0;
            currentY = 0;
        };

        sheet.addEventListener('touchstart', handleTouchStart);
        sheet.addEventListener('touchmove', handleTouchMove);
        sheet.addEventListener('touchend', handleTouchEnd);

        return () => {
            sheet.removeEventListener('touchstart', handleTouchStart);
            sheet.removeEventListener('touchmove', handleTouchMove);
            sheet.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const options: ActionSheetOption[] = [
        {
            label: 'Share Project',
            icon: <Share2 className="h-5 w-5" />,
            onClick: () => {
                onShare();
                onClose();
            },
        },
        {
            label: 'Project Settings',
            icon: <Settings className="h-5 w-5" />,
            onClick: () => {
                onSettings();
                onClose();
            },
        },
        {
            label: 'Manage Members',
            icon: <Users className="h-5 w-5" />,
            onClick: () => {
                onManageMembers();
                onClose();
            },
        },
        {
            label: 'Edit Project',
            icon: <Pencil className="h-5 w-5" />,
            onClick: () => {
                onEdit();
                onClose();
            },
        },
        {
            label: 'Delete Project',
            icon: <Trash2 className="h-5 w-5" />,
            onClick: () => {
                onDelete();
                onClose();
            },
            variant: 'danger',
        },
    ];

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
                onClick={onClose}
            />

            {/* Sheet */}
            <div 
                ref={sheetRef}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-[slideUp_0.25s_ease-out] touch-pan-y"
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${project.color} flex items-center justify-center text-white font-medium`}>
                            {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                            <p className="text-xs text-gray-500">
                                {project.stats.members} member{project.stats.members !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Options */}
                <div className="py-2">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            onClick={option.onClick}
                            className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                                option.variant === 'danger' 
                                    ? 'text-red-600 hover:bg-red-50 active:bg-red-100' 
                                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                            }`}
                        >
                            <span className={option.variant === 'danger' ? 'text-red-500' : 'text-gray-400'}>
                                {option.icon}
                            </span>
                            <span className="font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>

                {/* Cancel button */}
                <div className="p-4 pt-2 pb-8">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectActionSheet;
