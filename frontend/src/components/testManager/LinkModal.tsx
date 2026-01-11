import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface LinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (url: string, openInNewTab: boolean) => void;
    initialUrl?: string;
    initialOpenInNewTab?: boolean;
}

const LinkModal: React.FC<LinkModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialUrl = '',
    initialOpenInNewTab = true,
}) => {
    const [url, setUrl] = useState(initialUrl);
    const [openInNewTab, setOpenInNewTab] = useState(initialOpenInNewTab);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setUrl(initialUrl);
            setOpenInNewTab(initialOpenInNewTab);
            setError('');
        }
    }, [isOpen, initialUrl, initialOpenInNewTab]);

    const validateUrl = (urlString: string): boolean => {
        if (!urlString.trim()) {
            setError('URL cannot be empty');
            return false;
        }

        // Allow mailto: and relative URLs
        if (urlString.startsWith('mailto:') || urlString.startsWith('#') || urlString.startsWith('/')) {
            return true;
        }

        // For http/https, validate URL format
        if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
            try {
                new URL(urlString);
                return true;
            } catch {
                setError('Invalid URL format');
                return false;
            }
        }

        // If no protocol, assume http
        try {
            new URL(`http://${urlString}`);
            return true;
        } catch {
            setError('Invalid URL format');
            return false;
        }
    };

    const handleConfirm = () => {
        if (validateUrl(url)) {
            let finalUrl = url;
            // Add http:// if no protocol specified
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:') && !finalUrl.startsWith('#') && !finalUrl.startsWith('/')) {
                finalUrl = `http://${finalUrl}`;
            }
            onConfirm(finalUrl, openInNewTab);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Insert Link</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            URL
                        </label>
                        <input
                            id="url"
                            type="text"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="https://example.com or mailto:email@example.com"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={openInNewTab}
                            onChange={(e) => setOpenInNewTab(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            Open in new tab
                            <ExternalLink className="w-3 h-3" />
                        </span>
                    </label>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Insert Link
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkModal;
