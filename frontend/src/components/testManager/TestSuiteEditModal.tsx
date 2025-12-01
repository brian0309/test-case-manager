import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import { TestSuite } from '../../types/testManager';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    suite: TestSuite | null;
    projectId?: string | null;
}

const TestSuiteEditModal: React.FC<Props> = ({ isOpen, onClose, suite, projectId }) => {
    const { updateTestSuite, fetchTestSuites } = useTestManagerStore();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when suite changes or modal opens
    useEffect(() => {
        if (suite && isOpen) {
            setName(suite.name);
            setDescription(suite.description || '');
            setError(null);
        }
    }, [suite, isOpen]);

    if (!isOpen || !suite) return null;

    const validate = (): string | null => {
        if (!name || name.trim().length === 0) return 'Suite name is required';
        if (name.trim().length > 200) return 'Suite name must be 200 characters or less';
        return null;
    };

    const handleSave = async () => {
        const v = validate();
        if (v) {
            setError(v);
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await updateTestSuite(suite.id, { 
                name: name.trim(), 
                description: description.trim() 
            });
            // Refresh suites
            if (projectId) {
                await fetchTestSuites(projectId);
            }
            toast.success('Test suite updated successfully');
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Could not update test suite');
            toast.error(err?.message || 'Failed to update test suite');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full h-full sm:h-auto sm:max-w-xl bg-white sm:rounded-2xl shadow-2xl overflow-y-auto animate-[scaleIn_0.12s_ease-out]">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-semibold">Edit Suite</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Suite Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-0 outline-none text-sm"
                            placeholder="e.g. Regression Tests"
                            maxLength={200}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-0 outline-none text-sm resize-none"
                            rows={3}
                            maxLength={500}
                            placeholder="Short description of this suite"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg text-sm text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-2 ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestSuiteEditModal;
