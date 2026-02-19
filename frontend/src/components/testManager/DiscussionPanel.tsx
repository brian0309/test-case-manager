import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Paperclip, X, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { socketService, SocketEvents } from '../../services/socket';
import {
    fetchDiscussionMessages,
    sendDiscussionMessage,
    DiscussionMessage,
    DiscussionAttachment,
} from '../../services/discussionApi';
import { uploadImage, validateImageFile } from '../../utils/imageUpload';
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

const DiscussionPanel: React.FC<DiscussionPanelProps> = ({ testCaseId, projectId }) => {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(true);
    const [messages, setMessages] = useState<DiscussionMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<DiscussionAttachment[]>([]);
    const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
    const [pastedFile, setPastedFile] = useState<File | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Real-time socket listener
    useEffect(() => {
        const handleNewMessage = (data: SocketEvents['discussion:created']) => {
            if (data.testCaseId === testCaseId) {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });
            }
        };
        socketService.on('discussion:created', handleNewMessage);
        return () => {
            socketService.off('discussion:created', handleNewMessage);
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

            await sendDiscussionMessage(
                testCaseId,
                projectId,
                body || (allAttachments.length > 0 ? '(attachment)' : ''),
                allAttachments
            );

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
            <div className="w-full sm:w-80 md:w-96 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full">
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
                            <ChevronRight className="h-4 w-4" />
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
                                if (msg.type === 'system') {
                                    return (
                                        <div key={msg.id} className="flex justify-center my-2">
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">
                                                {msg.body}
                                            </span>
                                        </div>
                                    );
                                }

                                const isOwn = msg.user.id === currentUserId;

                                return (
                                    <div key={msg.id} className={`flex gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        {!isOwn && (
                                            <img
                                                src={msg.user.avatar}
                                                alt={msg.user.name}
                                                className="w-6 h-6 rounded-full mt-1 flex-shrink-0 object-cover"
                                            />
                                        )}
                                        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                            {!isOwn && (
                                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 block">
                                                    {msg.user.name}
                                                </span>
                                            )}
                                            <div
                                                className={`rounded-lg px-3 py-1.5 text-sm break-words ${
                                                    isOwn
                                                        ? 'bg-blue-500 text-white rounded-br-sm'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                                                }`}
                                            >
                                                {msg.body}
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
                                                                    className="block rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                                                                >
                                                                    <img src={att.url} alt={att.filename} className="max-w-[180px] max-h-[120px] object-cover" />
                                                                    <div className="px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 truncate">
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
                                                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <Paperclip className="h-3 w-3 text-gray-400" />
                                                                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{att.filename}</span>
                                                                <span className="text-[10px] text-gray-400">{formatFileSize(att.fileSize)}</span>
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
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
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
};

export default DiscussionPanel;
