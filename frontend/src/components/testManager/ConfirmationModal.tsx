import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    /** If provided, user must type this text exactly to enable the confirm button */
    requireConfirmationText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    isLoading = false,
    requireConfirmationText,
}) => {
    const [typedConfirmation, setTypedConfirmation] = useState('');

    // Reset the typed confirmation when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setTypedConfirmation('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isConfirmDisabled = requireConfirmationText 
        ? typedConfirmation !== requireConfirmationText 
        : false;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-white/20 overflow-hidden transform transition-all scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {title}
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {message}
                            </p>
                            {requireConfirmationText && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-red-600">{requireConfirmationText}</span> to confirm:
                                    </label>
                                    <input
                                        type="text"
                                        value={typedConfirmation}
                                        onChange={(e) => setTypedConfirmation(e.target.value)}
                                        placeholder={requireConfirmationText}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                        autoComplete="off"
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading || isConfirmDisabled}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                            ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
