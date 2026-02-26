import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react';
import { TestRun, RunItemStatus } from '../../../types/testManager';
import RichTextEditor from '../../../components/testManager/RichTextEditor';
import { getItemStatusColor } from './testRunUtils';

export interface ExecuteRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRun | null;
    onUpdateItem: (itemId: string, status: RunItemStatus, actualResult?: string) => Promise<void>;
    onComplete: () => Promise<void>;
    startIndex?: number;
}

const ExecuteRunModal: React.FC<ExecuteRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    onUpdateItem,
    onComplete,
    startIndex = 0,
}) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [actualResult, setActualResult] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Reset index when modal opens with a new startIndex
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(startIndex);
        }
    }, [isOpen, startIndex]);

    useEffect(() => {
        if (testRun && testRun.items[currentIndex]) {
            setActualResult(testRun.items[currentIndex].actualResult || '');
        }
    }, [testRun, currentIndex]);

    if (!isOpen || !testRun) return null;

    const currentItem = testRun.items[currentIndex];
    const totalItems = testRun.items.length;
    const executedCount = testRun.items.filter(i => i.status !== RunItemStatus.NotRun).length;

    const handleStatusUpdate = async (status: RunItemStatus) => {
        setIsUpdating(true);
        try {
            await onUpdateItem(currentItem.id, status, actualResult);
            // Move to next item if not last
            if (currentIndex < totalItems - 1) {
                setCurrentIndex(currentIndex + 1);
                setActualResult('');
            }
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
            onClose();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to complete run');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{testRun.title}</h2>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Progress: {executedCount} / {totalItems} ({Math.round((executedCount / totalItems) * 100)}%)
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-700 flex">
                    {testRun.items.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`flex-1 ${getItemStatusColor(item.status)} ${idx === currentIndex ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                            style={{ cursor: 'pointer' }}
                        />
                    ))}
                </div>

                {/* Current item */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Case {currentIndex + 1} of {totalItems}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded ${getItemStatusColor(currentItem.status)} text-white`}>
                                {currentItem.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1))}
                                disabled={currentIndex === totalItems - 1}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                        {currentItem.caseSnapshot.title}
                    </h3>

                    {currentItem.caseSnapshot.testDescription && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.testDescription}</p>
                        </div>
                    )}

                    {currentItem.caseSnapshot.stepsContent && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Steps</h4>
                            <RichTextEditor
                                content={currentItem.caseSnapshot.stepsContent}
                                onChange={() => {}}
                                editable={false}
                            />
                        </div>
                    )}

                    {currentItem.caseSnapshot.expectedResult && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Result</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.expectedResult}</p>
                        </div>
                    )}

                    <div className="mb-0">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actual Result / Notes</h4>
                        <RichTextEditor
                            content={actualResult}
                            onChange={setActualResult}
                            placeholder="Enter actual result or notes..."
                            editable={true}
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-t border-gray-100 dark:border-gray-700">
                    {/* Mobile: Stacked layout */}
                    <div className="sm:hidden flex flex-col gap-3">
                        {/* Status buttons grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-green-600 rounded-lg active:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-red-600 rounded-lg active:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-orange-600 rounded-lg active:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        {/* Complete button */}
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>

                    {/* Desktop: Horizontal layout */}
                    <div className="hidden sm:flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecuteRunModal;
