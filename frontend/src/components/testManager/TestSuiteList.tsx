
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TestCase, TestSuite, Status } from '../../types/testManager';
import { Folder, MoreHorizontal, PieChart, AlertCircle, Plus, Pencil, Trash2, Share2 } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';

interface TestSuiteListProps {
    testCases: TestCase[];
    testSuites: TestSuite[];
    onSuiteClick: (suiteName: string, suiteId?: string) => void;
    onCreate: () => void;
    onEdit?: (suite: TestSuite) => void;
    onDelete?: (suite: TestSuite) => void;
}

interface DropdownPosition {
    suiteId: string;
    top: number;
    right: number;
}

const TestSuiteList: React.FC<TestSuiteListProps> = ({ testCases, testSuites, onSuiteClick, onCreate, onEdit, onDelete }) => {
    const navigate = useNavigate();
    const { setActiveSuiteWithId, setFilters, setActiveArea } = useTestManagerStore();
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
    const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownPosition(null);
                setSelectedSuite(null);
            }
        };

        if (dropdownPosition) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownPosition]);

    // Use testSuites from API if available, otherwise derive from testCases for backwards compatibility
    const suites = testSuites.length > 0
        ? testSuites
        : Array.from(new Set(testCases.map(tc => tc.suite))).sort().map(name => ({ 
            id: name, 
            name, 
            projectId: '', 
            description: '', 
            createdAt: new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
        } as TestSuite));

    const getSuiteStats = (suiteName: string) => {
        const cases = testCases.filter(c => c.suite === suiteName);
        const total = cases.length;

        // Count all statuses
        const passed = cases.filter(c => [Status.Passed, Status.PassFixed].includes(c.status)).length;
        const failed = cases.filter(c => c.status === Status.Failed).length;
        const retest = cases.filter(c => c.status === Status.Retest).length;
        const skipped = cases.filter(c => c.status === Status.Skipped).length;
        const draft = cases.filter(c => c.status === Status.Draft).length;

        // Progress calculation: passed tests as percentage of total
        // This represents actual success/completion, not just execution
        const executed = passed + failed + retest;
        const progress = total === 0 ? 0 : Math.round((passed / total) * 100);

        return { total, passed, failed, retest, skipped, draft, executed, progress };
    };

    const handleMenuClick = (e: React.MouseEvent, suite: TestSuite) => {
        e.stopPropagation();
        setSelectedSuite(suite);

        // Position dropdown near the button
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDropdownPosition({
            suiteId: suite.id,
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
    };

    const handleShareClick = async (e: React.MouseEvent, suiteId: string) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/test-manager/cases?suiteId=${suiteId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        } catch (err) {
            console.error('Failed to copy link: ', err);
            toast.error('Failed to copy link');
        }
    };

    const handleEdit = () => {
        setDropdownPosition(null);
        if (selectedSuite && onEdit) {
            onEdit(selectedSuite);
        }
    };

    const handleDelete = () => {
        setDropdownPosition(null);
        if (selectedSuite && onDelete) {
            onDelete(selectedSuite);
        }
    };

    const handleStatusClick = (e: React.MouseEvent, suite: TestSuite, status: Status) => {
        e.stopPropagation(); // Prevent suite card click
        // Set the suite as active
        setActiveSuiteWithId(suite.id, suite.name);
        // Set the filter for the clicked status
        setFilters({ status: [status] });
        // Reset area filter
        setActiveArea(null);
        // Navigate to test cases page
        navigate('/test-manager/cases');
    };

    return (
        <>
        <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Create New Suite Card */}
                <div
                    onClick={onCreate}
                    className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[200px]"
                >
                    <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-6 w-6 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Create New Suite</h3>
                    <p className="text-xs text-gray-500 mt-1 text-center">Organize your cases</p>
                </div>

                {suites.map(suite => {
                    const stats = getSuiteStats(suite.name);

                    return (
                        <div
                            key={suite.id || suite.name}
                            onClick={() => onSuiteClick(suite.name, suite.id)}
                            className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                            <Folder className="h-5 w-5 fill-blue-100" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-lg tracking-tight">{suite.name}</h3>
                                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stats.total} Cases</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => handleShareClick(e, suite.id)}
                                            className="p-2 text-gray-300 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Share Suite"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleMenuClick(e, suite)}
                                            className="p-2 text-gray-300 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-gray-700">Progress</span>
                                        <span className={`font-semibold ${stats.progress === 100 ? 'text-green-600' : 'text-gray-900'}`}>{stats.progress}%</span>
                                    </div>

                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                                        {/* Passed - Green */}
                                        {stats.passed > 0 && (
                                            <div
                                                className="bg-green-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* Failed - Red */}
                                        {stats.failed > 0 && (
                                            <div
                                                className="bg-red-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* Retest - Orange */}
                                        {stats.retest > 0 && (
                                            <div
                                                className="bg-orange-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.retest / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* Draft - Gray */}
                                        {stats.draft > 0 && (
                                            <div
                                                className="bg-gray-400 h-full transition-all duration-500"
                                                style={{ width: `${(stats.draft / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* Skipped - Blue */}
                                        {stats.skipped > 0 && (
                                            <div
                                                className="bg-blue-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.skipped / stats.total) * 100}%` }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50 mt-4">
                                {stats.passed > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Passed)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1.5 rounded-full hover:bg-green-100 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        {stats.passed} Passed
                                    </button>
                                )}
                                {stats.failed > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Failed)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1.5 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
                                    >
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        {stats.failed} Failed
                                    </button>
                                )}
                                {stats.retest > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Retest)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-full hover:bg-orange-100 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                        {stats.retest} Retest
                                    </button>
                                )}
                                {stats.draft > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Draft)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                        {stats.draft} Draft
                                    </button>
                                )}
                                {stats.skipped > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Skipped)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        {stats.skipped} Skipped
                                    </button>
                                )}
                                {stats.total === 0 && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 px-2 py-1.5">
                                        <PieChart className="h-3.5 w-3.5" />
                                        No test cases
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Dropdown Menu */}
        {dropdownPosition && (
            <div
                ref={dropdownRef}
                className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-48 animate-[scaleIn_0.1s_ease-out]"
                style={{
                    top: dropdownPosition.top,
                    right: dropdownPosition.right,
                }}
            >
                <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <Pencil className="h-4 w-4 text-gray-400" />
                    Edit Suite
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Suite
                </button>
            </div>
        )}
        </>
    );
};

export default TestSuiteList;
