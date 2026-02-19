import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Send, Image as ImageIcon, X, Loader2, Trash2 } from 'lucide-react';
import { DiscussionMessage } from '../../types/testManager';
import { getDiscussions, createMessage, deleteMessage } from '../../services/discussionApi';
import { socketService, SocketEvents } from '../../services/socket';
import { uploadImage, validateImageFile } from '../../utils/imageUpload';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface DiscussionPanelProps {
    testCaseId: string;
    projectId: string;
}

const DiscussionPanel: React.FC<DiscussionPanelProps> = ({ testCaseId }) => {
    const { user } = useAuthStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [messages, setMessages] = useState<DiscussionMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom of messages
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Load discussions
    useEffect(() => {
        const loadDiscussions = async () => {
            try {
                setLoading(true);
                const discussion = await getDiscussions(testCaseId);
                setMessages(discussion.messages);
            } catch (error) {
                console.error('Failed to load discussions:', error);
                toast.error('Failed to load discussions');
            } finally {
                setLoading(false);
            }
        };

        loadDiscussions();
    }, [testCaseId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (!loading) {
            scrollToBottom();
        }
    }, [messages, loading, scrollToBottom]);

    // Subscribe to real-time message events
    useEffect(() => {
        const handleMessageCreated = (data: SocketEvents['discussion:message-created']) => {
            if (data.testCaseId === testCaseId) {
                setMessages(prev => [...prev, data.message]);
            }
        };

        const handleMessageDeleted = (data: SocketEvents['discussion:message-deleted']) => {
            if (data.testCaseId === testCaseId) {
                setMessages(prev => prev.filter(m => m.id !== data.messageId));
            }
        };

        socketService.on('discussion:message-created', handleMessageCreated);
        socketService.on('discussion:message-deleted', handleMessageDeleted);

        return () => {
            socketService.off('discussion:message-created', handleMessageCreated);
            socketService.off('discussion:message-deleted', handleMessageDeleted);
        };
    }, [testCaseId]);

    // Handle image upload
    const handleImageUpload = async (file: File) => {
        const validationError = validateImageFile(file);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setUploadingImage(true);
        try {
            const uploadedUrl = await uploadImage(file);
            setImagePreviewUrl(uploadedUrl);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error((error as Error).message || 'Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    // Handle paste
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    await handleImageUpload(file);
                }
                break;
            }
        }
    };

    // Handle submit
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!inputText.trim() && !imagePreviewUrl) {
            return;
        }

        setIsSubmitting(true);
        try {
            await createMessage(testCaseId, inputText.trim() || 'Image', imagePreviewUrl || undefined);
            setInputText('');
            setImagePreviewUrl(null);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete message
    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            await deleteMessage(testCaseId, messageId);
        } catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message');
        }
    };

    // Format timestamp
    const formatTimestamp = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = diff / (1000 * 60 * 60);

        if (hours < 24) {
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div className={`flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 transition-all ${isCollapsed ? 'w-12' : 'w-full md:w-96'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {!isCollapsed && (
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Discussion</h3>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    title={isCollapsed ? 'Expand discussion' : 'Collapse discussion'}
                >
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
            </div>

            {!isCollapsed && (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div key={message.id} className="group">
                                    <div className="flex items-start gap-2">
                                        {/* Avatar */}
                                        <div className="flex-shrink-0">
                                            {message.authorAvatar ? (
                                                <img
                                                    src={message.authorAvatar}
                                                    alt={message.authorName}
                                                    className="h-8 w-8 rounded-full"
                                                />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                                    {message.authorName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Message Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {message.authorName}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    {formatTimestamp(message.createdAt)}
                                                </span>
                                            </div>

                                            {message.messageType === 'image' && message.imageUrl && (
                                                <img
                                                    src={message.imageUrl}
                                                    alt="Uploaded"
                                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity mb-2"
                                                    onClick={() => setFullscreenImage(message.imageUrl!)}
                                                />
                                            )}

                                            {message.content && (
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                                    {message.content}
                                                </p>
                                            )}
                                        </div>

                                        {/* Delete Button */}
                                        {user?._id === message.authorId && (
                                            <button
                                                onClick={() => handleDeleteMessage(message.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-opacity"
                                                title="Delete message"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {imagePreviewUrl && (
                            <div className="relative mb-2 inline-block">
                                <img
                                    src={imagePreviewUrl}
                                    alt="Preview"
                                    className="max-w-[200px] rounded-lg"
                                />
                                <button
                                    onClick={() => setImagePreviewUrl(null)}
                                    className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex items-end gap-2">
                            <div className="flex-1">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onPaste={handlePaste}
                                    placeholder="Type a message or paste an image..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={2}
                                    disabled={isSubmitting || uploadingImage}
                                />
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting || uploadingImage}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                title="Upload image"
                            >
                                {uploadingImage ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <ImageIcon className="h-5 w-5" />
                                )}
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting || uploadingImage || (!inputText.trim() && !imagePreviewUrl)}
                                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Send message"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Fullscreen Image Viewer */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setFullscreenImage(null)}
                >
                    <button
                        onClick={() => setFullscreenImage(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={fullscreenImage}
                        alt="Fullscreen"
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default DiscussionPanel;
