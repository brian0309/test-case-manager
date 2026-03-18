import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, ChevronRight, MessageSquare, MoreHorizontal, Paperclip, Send, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { socketService, SocketEvents } from '../../services/socket';
import {
    deleteDiscussionMessage,
    fetchDiscussionMessages,
    sendDiscussionMessage,
    updateDiscussionMessageFixState,
    DiscussionMessage,
    DiscussionAttachment,
    DiscussionMessageFixState,
} from '../../services/discussionApi';
import { uploadImage, validateImageFile } from '../../utils/imageUpload';
import { sanitizeHtml } from '../../utils/sanitize';
import toast from 'react-hot-toast';

interface DiscussionPanelProps {
    testCaseId: string;
    projectId: string;
}

// Group messages by date label
const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const updateMessageInList = (messages: DiscussionMessage[], nextMessage: DiscussionMessage): DiscussionMessage[] => {
    const index = messages.findIndex((message) => message.id === nextMessage.id);
    if (index === -1) {
        return [...messages, nextMessage];
    }

    const next = [...messages];
    next[index] = nextMessage;
    return next;
};

const removeMessageFromList = (messages: DiscussionMessage[], messageId: string): DiscussionMessage[] => {
    return messages.filter((message) => message.id !== messageId);
};

/**
 * Parse a system message body and return React nodes with the run ID hyperlinked.
 * Matches the pattern: (ID: <mongoId>)
 */
const renderSystemMessageBody = (
    body: string,
    testCaseId: string,
    isFailedMessage: boolean,
): React.ReactNode => {
    const runMatch = body.match(/\(ID:\s*([a-f0-9]{24})\)/i);
    if (!runMatch) return body;

    const itemMatch = body.match(/\(ITEM_ID:\s*([a-f0-9]{24})\)/i);
    const idToken = runMatch[0];  // e.g. "(ID: 69a0081fc1100c76a417d009)"
    const runId = runMatch[1];
    const itemId = itemMatch?.[1];
    const [before, afterRaw] = body.split(idToken);
    const after = itemMatch ? afterRaw.replace(itemMatch[0], '') : afterRaw;
    const href = itemId
        ? `/test-manager/runs?runId=${runId}&itemId=${itemId}&caseId=${testCaseId}`
        : `/test-manager/runs?runId=${runId}&caseId=${testCaseId}`;

    return (
        <>
            {before}
            <span>(ID:&nbsp;</span>
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline transition-colors font-mono ${
                    isFailedMessage
                        ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                        : 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
                }`}
                title="Open test run in new tab"
            >
                {runId}
            </a>
            <span>)</span>
            {after}
        </>
    );
};

const renderMessageBody = (msg: DiscussionMessage, testCaseId: string, isOwn: boolean): React.ReactNode => {
    if (msg.bodyFormat === 'html') {
        const useOwnBubbleColors = isOwn && !msg.fixState && msg.type !== 'system';

        return (
            <div
                className={`text-sm break-words whitespace-normal [&_a]:underline [&_img]:max-w-full [&_img]:cursor-zoom-in [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 ${
                    useOwnBubbleColors
                        ? 'text-white [&_a]:text-white'
                        : 'text-gray-800 dark:text-gray-100 [&_a]:text-blue-700 dark:[&_a]:text-blue-300'
                }`}
                onClick={(event) => {
                    const target = event.target;
                    if (target instanceof HTMLImageElement) {
                        event.preventDefault();
                        const imageUrl = target.currentSrc || target.src;
                        if (imageUrl) {
                            window.dispatchEvent(new CustomEvent('discussion:open-lightbox', { detail: imageUrl }));
                        }
                    }
                }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.body) }}
            />
        );
    }

    if (msg.type === 'system') {
        const isFailedMessage = /failed in test run/i.test(msg.body);
        return renderSystemMessageBody(msg.body, testCaseId, isFailedMessage);
    }

    return <span className="whitespace-pre-wrap">{msg.body}</span>;
};

const DiscussionPanel: React.FC<DiscussionPanelProps> = React.memo(function DiscussionPanel({ testCaseId, projectId }) {
    const { user } = useAuthStore();
    const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
    const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 1024);
    const [messages, setMessages] = useState<DiscussionMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [updatingMessageId, setUpdatingMessageId] = useState<string | null>(null);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
    const [pendingAttachments, setPendingAttachments] = useState<DiscussionAttachment[]>([]);
    const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
    const [pastedFile, setPastedFile] = useState<File | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOpenLightbox = (event: Event) => {
            const customEvent = event as CustomEvent<string>;
            if (customEvent.detail) {
                setLightboxUrl(customEvent.detail);
            }
        };

        window.addEventListener('discussion:open-lightbox', handleOpenLightbox as EventListener);

        return () => {
            window.removeEventListener('discussion:open-lightbox', handleOpenLightbox as EventListener);
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const desktop = window.innerWidth >= 1024;
            setIsDesktop((previousIsDesktop) => {
                if (previousIsDesktop !== desktop) {
                    setIsOpen(desktop);
                }
                return desktop;
            });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (!activeMenuMessageId) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuMessageId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeMenuMessageId]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Fetch messages on mount/testCaseId change
    useEffect(() => {
        const loadMessages = async () => {
            setIsLoading(true);
            try {
                const msgs = await fetchDiscussionMessages(testCaseId);
                setMessages(msgs);
            } catch {
                console.error('Failed to load discussion messages');
            } finally {
                setIsLoading(false);
            }
        };
        loadMessages();
    }, [testCaseId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Ensure socket is connected and in the correct project room for live updates
    useEffect(() => {
        if (!socketService.isConnected()) {
            socketService.connect();
        }
        // Defensively join the project room so discussion events are received
        // even if the parent hooks haven't joined yet (race condition on initial load).
        // joinProject is idempotent — re-joining the same room is a no-op on the server.
        if (projectId) {
            socketService.joinProject(projectId);
        }
    }, [projectId]);

    // Real-time socket listener
    useEffect(() => {
        const handleNewMessage = (data: SocketEvents['discussion:created']) => {
            if (data.testCaseId === testCaseId) {
                setMessages((prev) => updateMessageInList(prev, data.message));
            }
        };
        const handleUpdatedMessage = (data: SocketEvents['discussion:updated']) => {
            if (data.testCaseId === testCaseId) {
                setMessages((prev) => updateMessageInList(prev, data.message));
            }
        };
        const handleDeletedMessage = (data: SocketEvents['discussion:deleted']) => {
            if (data.testCaseId === testCaseId) {
                setMessages((prev) => removeMessageFromList(prev, data.messageId));
                setActiveMenuMessageId((current) => (current === data.messageId ? null : current));
            }
        };
        socketService.on('discussion:created', handleNewMessage);
        socketService.on('discussion:updated', handleUpdatedMessage);
        socketService.on('discussion:deleted', handleDeletedMessage);
        return () => {
            socketService.off('discussion:created', handleNewMessage);
            socketService.off('discussion:updated', handleUpdatedMessage);
            socketService.off('discussion:deleted', handleDeletedMessage);
        };
    }, [testCaseId]);

    const handleSend = async () => {
        const body = inputValue.trim();
        if (!body && pendingAttachments.length === 0 && !pastedFile) return;
        if (isSending) return;

        setIsSending(true);
        try {
            const allAttachments = [...pendingAttachments];

            // Upload pasted image if present
            if (pastedFile) {
                const url = await uploadImage(pastedFile);
                allAttachments.push({
                    url,
                    filename: pastedFile.name,
                    fileSize: pastedFile.size,
                    contentType: pastedFile.type,
                });
            }

            const sentMessage = await sendDiscussionMessage(
                testCaseId,
                projectId,
                body || (allAttachments.length > 0 ? '(attachment)' : ''),
                allAttachments
            );

            // Immediately add the message to the local state so it appears
            // without waiting for the socket event. The socket listener
            // already deduplicates by id, so no double-render will occur.
            setMessages((prev) => updateMessageInList(prev, sentMessage));

            setInputValue('');
            setPendingAttachments([]);
            setPastedImagePreview(null);
            setPastedFile(null);
        } catch {
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    const error = validateImageFile(file);
                    if (error) {
                        toast.error(error);
                        return;
                    }
                    // Revoke previous blob URL to prevent memory leak
                    if (pastedImagePreview) {
                        URL.revokeObjectURL(pastedImagePreview);
                    }
                    setPastedFile(file);
                    setPastedImagePreview(URL.createObjectURL(file));
                }
                return;
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            const error = validateImageFile(file);
            if (error) {
                toast.error(error);
                continue;
            }
            try {
                const url = await uploadImage(file);
                setPendingAttachments(prev => [
                    ...prev,
                    {
                        url,
                        filename: file.name,
                        fileSize: file.size,
                        contentType: file.type,
                    },
                ]);
            } catch {
                toast.error(`Failed to upload ${file.name}`);
            }
        }
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const removePendingAttachment = (index: number) => {
        setPendingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const clearPastedImage = () => {
        if (pastedImagePreview) {
            URL.revokeObjectURL(pastedImagePreview);
        }
        setPastedImagePreview(null);
        setPastedFile(null);
    };

    const handleFixStateChange = async (messageId: string, fixState: DiscussionMessageFixState) => {
        if (updatingMessageId === messageId) return;

        const currentMessage = messages.find((message) => message.id === messageId);
        if (!currentMessage || currentMessage.fixState === fixState) {
            return;
        }

        const previousMessages = messages;
        const optimisticMessage = { ...currentMessage, fixState };

        setUpdatingMessageId(messageId);
        setMessages((prev) => updateMessageInList(prev, optimisticMessage));

        try {
            const updatedMessage = await updateDiscussionMessageFixState(testCaseId, messageId, projectId, fixState);
            setMessages((prev) => updateMessageInList(prev, updatedMessage));
        } catch {
            setMessages(previousMessages);
            toast.error('Failed to update fix status');
        } finally {
            setUpdatingMessageId((current) => (current === messageId ? null : current));
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (deletingMessageId === messageId) {
            return;
        }

        const message = messages.find((entry) => entry.id === messageId);
        if (!message || message.user.id !== currentUserId) {
            return;
        }

        const confirmed = window.confirm('Delete this message?');
        if (!confirmed) {
            return;
        }

        const previousMessages = messages;

        setDeletingMessageId(messageId);
        setActiveMenuMessageId(null);
        setMessages((prev) => removeMessageFromList(prev, messageId));

        try {
            await deleteDiscussionMessage(testCaseId, messageId);
        } catch {
            setMessages(previousMessages);
            toast.error('Failed to delete message');
        } finally {
            setDeletingMessageId((current) => (current === messageId ? null : current));
        }
    };

    // Get unique participants from messages
    const participants = React.useMemo(() => {
        const map = new Map<string, DiscussionMessage['user']>();
        messages.forEach(m => {
            if (m.type === 'comment' && !map.has(m.user.id)) {
                map.set(m.user.id, m.user);
            }
        });
        return Array.from(map.values());
    }, [messages]);

    // Group messages by date
    const groupedMessages = React.useMemo(() => {
        const groups: { label: string; messages: DiscussionMessage[] }[] = [];
        let currentLabel = '';
        messages.forEach(msg => {
            const label = getDateLabel(msg.createdAt);
            if (label !== currentLabel) {
                currentLabel = label;
                groups.push({ label, messages: [msg] });
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        });
        return groups;
    }, [messages]);

    const currentUserId = user?._id;

    // Collapsed state – show slim toggle tab
    if (!isOpen) {
        if (!isDesktop) {
            return (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed right-4 z-[60] inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Open Discussion"
                    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
                >
                    <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span>Discussion</span>
                    {messages.length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {messages.length}
                        </span>
                    )}
                </button>
            );
        }

        return (
            <div className="flex flex-col items-center">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-1 px-2 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Open Discussion"
                >
                    <MessageSquare className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    {messages.length > 0 && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{messages.length}</span>
                    )}
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl min-h-0 lg:static lg:z-auto lg:w-96 lg:flex-shrink-0 lg:border-t-0 lg:border-l lg:shadow-none">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Discussion</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Participant avatars */}
                        {participants.length > 0 && (
                            <div className="flex -space-x-1.5">
                                {participants.slice(0, 3).map(p => (
                                    <img
                                        key={p.id}
                                        src={p.avatar}
                                        alt={p.name}
                                        title={p.name}
                                        className="w-5 h-5 rounded-full border border-white dark:border-gray-800 object-cover"
                                    />
                                ))}
                                {participants.length > 3 && (
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 text-[9px] font-semibold text-gray-600 dark:text-gray-300 border border-white dark:border-gray-800">
                                        +{participants.length - 3}
                                    </span>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Collapse panel"
                        >
                            {isDesktop ? <ChevronRight className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Message thread */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
                    {isLoading && (
                        <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!isLoading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">No messages yet</p>
                            <p className="text-xs mt-1">Start the conversation</p>
                        </div>
                    )}

                    {groupedMessages.map(group => (
                        <div key={group.label}>
                            {/* Date separator */}
                            <div className="flex items-center gap-2 my-3">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    {group.label}
                                </span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                            </div>

                            {group.messages.map(msg => {
                                if (msg.type === 'system' && !msg.fixState && msg.bodyFormat !== 'html') {
                                    const isFailedMessage = /failed in test run/i.test(msg.body);
                                    return (
                                        <div key={msg.id} className="flex justify-center my-2">
                                            <span className={`text-[11px] italic px-2 py-0.5 rounded-full ${
                                                isFailedMessage
                                                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                                                    : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50'
                                            }`}>
                                                {renderSystemMessageBody(msg.body, testCaseId, isFailedMessage)}
                                            </span>
                                        </div>
                                    );
                                }

                                const isOwn = msg.user.id === currentUserId;
                                const canDelete = isOwn;
                                const isTrackedMessage = Boolean(msg.fixState);
                                const isUpdatingTrackedMessage = updatingMessageId === msg.id;
                                const isDeletingThisMessage = deletingMessageId === msg.id;
                                const trackedMessageToneClass = isTrackedMessage
                                    ? msg.fixState === 'fixed'
                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                                        : 'border border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100'
                                    : '';

                                return (
                                    <div key={msg.id} className={`group flex gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        {!isOwn && (
                                            <img
                                                src={msg.user.avatar}
                                                alt={msg.user.name}
                                                className="w-6 h-6 rounded-full mt-1 flex-shrink-0 object-cover"
                                            />
                                        )}
                                        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                            {!isOwn && msg.type !== 'system' && (
                                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 block">
                                                    {msg.user.name}
                                                </span>
                                            )}
                                            {isTrackedMessage && (
                                                <div className={`mb-1 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1 ${
                                                    msg.fixState === 'fixed'
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                                                }`}>
                                                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                                                        {msg.fixState === 'fixed' ? 'Fixed' : 'Not Fixed'}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFixStateChange(msg.id, 'fixed')}
                                                            disabled={isUpdatingTrackedMessage}
                                                            className={`rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                                                msg.fixState === 'fixed'
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : 'bg-white/70 text-emerald-700 hover:bg-emerald-100 dark:bg-gray-800/70 dark:text-emerald-300 dark:hover:bg-emerald-900/30'
                                                            }`}
                                                            title="Mark fixed"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFixStateChange(msg.id, 'not-fixed')}
                                                            disabled={isUpdatingTrackedMessage}
                                                            className={`rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                                                msg.fixState === 'not-fixed'
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-white/70 text-red-700 hover:bg-red-100 dark:bg-gray-800/70 dark:text-red-300 dark:hover:bg-red-900/30'
                                                            }`}
                                                            title="Mark not fixed"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`relative flex items-start gap-1.5 ${isOwn ? 'justify-end' : ''}`}>
                                                {canDelete && (
                                                    <div ref={activeMenuMessageId === msg.id ? menuRef : null} className="relative flex-shrink-0 pt-1">
                                                        <button
                                                            type="button"
                                                            aria-label="Message actions"
                                                            aria-haspopup="menu"
                                                            aria-expanded={activeMenuMessageId === msg.id}
                                                            onClick={() => setActiveMenuMessageId((current) => current === msg.id ? null : msg.id)}
                                                            className={`rounded-full border border-gray-200 bg-white/95 p-1 text-gray-500 shadow-sm transition-all hover:bg-white hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800/95 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white ${
                                                                activeMenuMessageId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                                                            }`}
                                                            title="Message actions"
                                                            disabled={isDeletingThisMessage}
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </button>
                                                        {activeMenuMessageId === msg.id && (
                                                            <div
                                                                role="menu"
                                                                className="absolute left-0 top-8 z-20 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                                    disabled={isDeletingThisMessage}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    {isDeletingThisMessage ? 'Deleting...' : 'Delete message'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div
                                                    className={`rounded-lg px-3 py-1.5 text-sm break-words ${
                                                        isTrackedMessage
                                                            ? trackedMessageToneClass
                                                            : msg.type === 'system'
                                                            ? 'border border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                                                            : isOwn
                                                            ? 'bg-blue-500 text-white rounded-br-sm'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                                                    } ${isDeletingThisMessage ? 'opacity-60' : ''}`}
                                                >
                                                    {renderMessageBody(msg, testCaseId, isOwn)}
                                                </div>
                                            </div>
                                            {/* Attachments */}
                                            {msg.attachments?.length > 0 && (
                                                <div className="mt-1 space-y-1">
                                                    {msg.attachments.map((att, idx) => {
                                                        const isImage = att.contentType?.startsWith('image/');
                                                        if (isImage) {
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setLightboxUrl(att.url)}
                                                                    className={`block rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${
                                                                        isTrackedMessage
                                                                            ? msg.fixState === 'fixed'
                                                                                ? 'border border-emerald-200 dark:border-emerald-800'
                                                                                : 'border border-red-200 dark:border-red-800'
                                                                            : 'border border-gray-200 dark:border-gray-700'
                                                                    }`}
                                                                >
                                                                    <img src={att.url} alt={att.filename} className="max-w-[180px] max-h-[120px] object-cover" />
                                                                    <div className={`px-2 py-1 text-[10px] truncate ${
                                                                        isTrackedMessage
                                                                            ? msg.fixState === 'fixed'
                                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                                : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                                                            : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                                    }`}>
                                                                        {att.filename} · {formatFileSize(att.fileSize)}
                                                                    </div>
                                                                </button>
                                                            );
                                                        }
                                                        return (
                                                            <a
                                                                key={idx}
                                                                href={att.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                                                                    isTrackedMessage
                                                                        ? msg.fixState === 'fixed'
                                                                            ? 'border border-emerald-200 bg-emerald-100/70 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/40'
                                                                            : 'border border-red-200 bg-red-100/70 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/40'
                                                                        : 'border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                                                                }`}
                                                            >
                                                                <Paperclip className={`h-3 w-3 ${
                                                                    isTrackedMessage
                                                                        ? msg.fixState === 'fixed'
                                                                            ? 'text-emerald-500 dark:text-emerald-300'
                                                                            : 'text-red-500 dark:text-red-300'
                                                                        : 'text-gray-400'
                                                                }`} />
                                                                <span className={`text-xs truncate ${
                                                                    isTrackedMessage
                                                                        ? msg.fixState === 'fixed'
                                                                            ? 'text-emerald-800 dark:text-emerald-200'
                                                                            : 'text-red-800 dark:text-red-200'
                                                                        : 'text-gray-600 dark:text-gray-300'
                                                                }`}>{att.filename}</span>
                                                                <span className={`text-[10px] ${
                                                                    isTrackedMessage
                                                                        ? msg.fixState === 'fixed'
                                                                            ? 'text-emerald-600 dark:text-emerald-300'
                                                                            : 'text-red-600 dark:text-red-300'
                                                                        : 'text-gray-400'
                                                                }`}>{formatFileSize(att.fileSize)}</span>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <span className={`text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block ${isOwn ? 'text-right' : ''}`}>
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800">
                    {/* Pending attachments */}
                    {(pendingAttachments.length > 0 || pastedImagePreview) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {pendingAttachments.map((att, idx) => (
                                <div key={idx} className="relative group">
                                    {att.contentType.startsWith('image/') ? (
                                        <img src={att.url} alt={att.filename} className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-gray-700" />
                                    ) : (
                                        <div className="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                                            <Paperclip className="h-4 w-4 text-gray-400" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removePendingAttachment(idx)}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5 text-white" />
                                    </button>
                                </div>
                            ))}
                            {pastedImagePreview && (
                                <div className="relative group">
                                    <img src={pastedImagePreview} alt="Pasted" className="w-12 h-12 rounded object-cover border border-blue-300 dark:border-blue-600" />
                                    <button
                                        onClick={clearPastedImage}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5 text-white" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-end gap-1.5">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                            title="Attach file"
                        >
                            <Paperclip className="h-4 w-4" />
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder="Type a comment..."
                            rows={1}
                            className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isSending || (!inputValue.trim() && pendingAttachments.length === 0 && !pastedFile)}
                            className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                            title="Send"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
                        Supports Markdown · @Mentions · #Issues
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Fullscreen Image Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 p-2.5 rounded-full border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white/70"
                        title="Close preview"
                        aria-label="Close preview"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
});

export default DiscussionPanel;
