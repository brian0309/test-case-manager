import React from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronRight, Eye } from 'lucide-react';
import { TestRun, RunItemStatus, RunItem } from '../../../types/testManager';
import {
    getRunStatusColor,
    getRunItemStatusBadgeColor,
    getPriorityColor,
} from './testRunUtils';

export interface RunDetailViewProps {
    testRun: TestRun;
    onBack: () => void;
    onUpdateItem: (itemId: string, status: RunItemStatus, actualResult?: string) => Promise<void>;
    onComplete: () => Promise<void>;
    onOpenExecute: (itemIndex: number) => void;
}

const RunDetailView: React.FC<RunDetailViewProps> = ({
    testRun,
    onBack,
    onUpdateItem,
    onComplete,
    onOpenExecute,
}) => {
    const executedCount = testRun.items.filter(i => i.status !== RunItemStatus.NotRun).length;
    const totalItems = testRun.items.length;

    const handleStatusChange = async (item: RunItem, newStatus: RunItemStatus) => {
        try {
            await onUpdateItem(item.id, newStatus, item.actualResult);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update status');
        }
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to complete run');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onBack}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                        title="Back to runs"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{testRun.title}</h2>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRunStatusColor(testRun.status)}`}>
                                {testRun.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{executedCount} / {totalItems} executed ({totalItems > 0 ? Math.round((executedCount / totalItems) * 100) : 0}%)</span>
                            <span>{testRun.resultsSummary.passRate}% pass rate</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleComplete}
                        disabled={executedCount < totalItems}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                            executedCount < totalItems
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                : 'text-white bg-blue-600 hover:bg-blue-700'
                        }`}
                        title={executedCount < totalItems ? 'Complete all test cases first' : 'Complete Run'}
                    >
                        Complete Run
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 dark:bg-gray-700 flex flex-shrink-0">
                {testRun.resultsSummary.passed > 0 && (
                    <div className="bg-green-500" style={{ width: `${(testRun.resultsSummary.passed / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.failed > 0 && (
                    <div className="bg-red-500" style={{ width: `${(testRun.resultsSummary.failed / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.blocked > 0 && (
                    <div className="bg-orange-500" style={{ width: `${(testRun.resultsSummary.blocked / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.skipped > 0 && (
                    <div className="bg-gray-400 dark:bg-gray-500" style={{ width: `${(testRun.resultsSummary.skipped / totalItems) * 100}%` }} />
                )}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none">
                        <tr>
                            <th className="py-2 pl-6 pr-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-12">#</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-1/3">Title</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-32">Priority</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-40">Run Status</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-40">Area</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                        {testRun.items.map((item, index) => (
                            <tr
                                key={item.id}
                                onClick={() => onOpenExecute(index)}
                                className="group transition-colors cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                            >
                                {/* Order */}
                                <td className="py-2.5 pl-6 pr-4 text-sm font-medium text-gray-400 dark:text-gray-500 font-mono tracking-tight group-hover:text-gray-900 dark:group-hover:text-gray-200">
                                    {index + 1}
                                </td>

                                {/* Title */}
                                <td className="py-2.5 px-4">
                                    <div className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{item.caseSnapshot.title}</div>
                                    {item.caseSnapshot.testDescription && (
                                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-md">
                                            {item.caseSnapshot.testDescription}
                                        </div>
                                    )}
                                </td>

                                {/* Priority */}
                                <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(item.caseSnapshot.priority)} shadow-sm`} />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.caseSnapshot.priority || 'N/A'}</span>
                                    </div>
                                </td>

                                {/* Run Status Dropdown */}
                                <td className="py-2.5 px-4">
                                    <div onClick={e => e.stopPropagation()}>
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleStatusChange(item, e.target.value as RunItemStatus)}
                                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border appearance-none cursor-pointer outline-none transition-colors text-center min-w-[90px] ${getRunItemStatusBadgeColor(item.status)}`}
                                        >
                                            <option value={RunItemStatus.NotRun}>Not Run</option>
                                            <option value={RunItemStatus.Passed}>Passed</option>
                                            <option value={RunItemStatus.Failed}>Failed</option>
                                            <option value={RunItemStatus.Blocked}>Blocked</option>
                                            <option value={RunItemStatus.Skipped}>Skipped</option>
                                        </select>
                                    </div>
                                </td>

                                {/* Area */}
                                <td className="py-2.5 px-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {item.caseSnapshot.area || '—'}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="py-2.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenExecute(index);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Execute Test Case"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile list */}
            <div className="block sm:hidden flex-1 overflow-auto p-2">
                {testRun.items.map((item, index) => (
                    <div
                        key={item.id}
                        onClick={() => onOpenExecute(index)}
                        className="relative mac-card overflow-hidden cursor-pointer transition-all active:scale-[0.98] mb-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/80"
                    >
                        {/* Priority Color Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(item.caseSnapshot.priority)}`} />

                        <div className="p-4 pl-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    {/* Top Row: Status & Index */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRunItemStatusBadgeColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                            #{index + 1}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h4 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                                        {item.caseSnapshot.title}
                                    </h4>

                                    {/* Area */}
                                    {item.caseSnapshot.area && (
                                        <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {item.caseSnapshot.area}
                                        </div>
                                    )}

                                    {/* Footer: Priority & Status change */}
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(item.caseSnapshot.priority)} shadow-sm`} />
                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                {item.caseSnapshot.priority || 'N/A'}
                                            </span>
                                        </div>
                                        <div onClick={e => e.stopPropagation()}>
                                            <select
                                                value={item.status}
                                                onChange={(e) => handleStatusChange(item, e.target.value as RunItemStatus)}
                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border appearance-none cursor-pointer outline-none transition-colors min-w-[80px] ${getRunItemStatusBadgeColor(item.status)}`}
                                            >
                                                <option value={RunItemStatus.NotRun}>Not Run</option>
                                                <option value={RunItemStatus.Passed}>Passed</option>
                                                <option value={RunItemStatus.Failed}>Failed</option>
                                                <option value={RunItemStatus.Blocked}>Blocked</option>
                                                <option value={RunItemStatus.Skipped}>Skipped</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RunDetailView;
