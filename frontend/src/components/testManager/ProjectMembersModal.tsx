import React, { useState } from 'react';
import { X, Crown, UserPlus, Trash2, Loader2, Mail } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';

interface Props {
    projectId: string;
    currentUserId: string;
    onClose: () => void;
}

const ProjectMembersModal: React.FC<Props> = ({ projectId, currentUserId, onClose }) => {
    const { projects, addProjectMember, removeProjectMember, fetchProjects } = useTestManagerStore();
    
    // Get fresh project data from store
    const project = projects.find(p => p.id === projectId);

    const [email, setEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // If project not found, close modal
    if (!project) {
        onClose();
        return null;
    }

    const isOwner = project.ownerId === currentUserId;

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError('Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsAdding(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await addProjectMember(project.id, trimmedEmail);
            await fetchProjects(); // Refresh projects to get updated members
            setEmail('');
            setSuccessMessage('Member added successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            // Backend returns specific error messages
            const message = err?.message || 'Failed to add member';
            if (message.includes('User not found')) {
                setError('No user found with that email address');
            } else if (message.includes('already a member')) {
                setError('This user is already a member of the project');
            } else {
                setError(message);
            }
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        setRemovingMemberId(memberId);
        setError(null);
        setSuccessMessage(null);

        try {
            await removeProjectMember(project.id, memberId);
            await fetchProjects(); // Refresh projects
            setSuccessMessage('Member removed');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to remove member');
        } finally {
            setRemovingMemberId(null);
        }
    };

    // Find owner info - owner might not be in members array
    const ownerMember = project.members.find(m => m.id === project.ownerId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />

            {/* Modal */}
            <div className="relative w-full h-full sm:h-auto sm:max-w-lg bg-white dark:bg-gray-800 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-[scaleIn_0.12s_ease-out]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Members</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{project.name}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white dark:bg-gray-800">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-3 rounded-lg flex items-start gap-2">
                            <span className="flex-1">{error}</span>
                            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    {successMessage && (
                        <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 p-3 rounded-lg">
                            {successMessage}
                        </div>
                    )}

                    {/* Add Member Form - Only for owners */}
                    {isOwner && (
                        <form onSubmit={handleAddMember} className="space-y-3">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                                Invite by Email
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError(null);
                                        }}
                                        placeholder="colleague@example.com"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-300 dark:focus:border-blue-500 focus:ring-0 outline-none text-sm placeholder-gray-400 dark:placeholder-gray-500"
                                        disabled={isAdding}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isAdding || !email.trim()}
                                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                >
                                    {isAdding ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <UserPlus className="h-4 w-4" />
                                    )}
                                    <span className="hidden sm:inline">Add</span>
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                The user must have an account to be added
                            </p>
                        </form>
                    )}

                    {/* Members List */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Members ({project.members.length})
                        </h4>

                        {/* Owner - Always show first */}
                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-medium text-sm">
                                    {ownerMember?.name?.charAt(0).toUpperCase() || 'O'}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                            {ownerMember?.name || 'Owner'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                            <Crown className="h-3 w-3" />
                                            Owner
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {ownerMember?.email || 'Project owner'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Other Members (non-owners) */}
                        {project.members
                            .filter(m => m.id !== project.ownerId)
                            .map((member) => (
                                <div 
                                    key={member.id} 
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                                            {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {member.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Remove button - Only for owners */}
                                    {isOwner && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            disabled={removingMemberId === member.id}
                                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                            title="Remove member"
                                        >
                                            {removingMemberId === member.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}

                        {/* Empty state - only show if there are no members besides the owner */}
                        {project.members.filter(m => m.id !== project.ownerId).length === 0 && isOwner && (
                            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                                <p>No other members yet. Invite someone to collaborate!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectMembersModal;
