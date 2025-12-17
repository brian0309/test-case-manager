import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, GripVertical, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import { Project, CustomFieldDefinition, CustomFieldOption, ProjectSettings } from '../../types/testManager';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
}

type TabType = 'general' | 'testCases' | 'customFields';

const ProjectSettingsModal: React.FC<Props> = ({ isOpen, onClose, project }) => {
    const { fetchProjectSettings, updateProjectSettings } = useTestManagerStore();

    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [settings, setSettings] = useState<ProjectSettings>({
        testCases: {
            hiddenDefaultFields: {},
            table: {
                hiddenDefaultColumns: {},
                visibleCustomFieldIds: [],
            },
            customFields: [],
        },
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Load settings when modal opens
    useEffect(() => {
        if (project && isOpen) {
            loadSettings();
        }
    }, [project, isOpen]);

    const loadSettings = async () => {
        if (!project) return;
        setIsLoading(true);
        try {
            const projectSettings = await fetchProjectSettings(project.id);
            setSettings(projectSettings || {
                testCases: {
                    hiddenDefaultFields: {},
                    table: {
                        hiddenDefaultColumns: {},
                        visibleCustomFieldIds: [],
                    },
                    customFields: [],
                },
            });
        } catch (error: any) {
            toast.error('Failed to load project settings');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !project) return null;

    const handleSave = async () => {
        if (!project) return;
        setIsSaving(true);
        try {
            await updateProjectSettings(project.id, settings);
            toast.success('Settings saved successfully');
            onClose();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs: Array<{ id: TabType; label: string }> = [
        { id: 'general', label: 'General' },
        { id: 'testCases', label: 'Test Cases' },
        { id: 'customFields', label: 'Custom Fields' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                        <Settings2 className="w-6 h-6 text-gray-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Project Settings</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 bg-white px-6">
                    <div className="flex gap-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'general' && (
                                <GeneralTab project={project} />
                            )}
                            {activeTab === 'testCases' && (
                                <TestCasesTab settings={settings} setSettings={setSettings} />
                            )}
                            {activeTab === 'customFields' && (
                                <CustomFieldsTab settings={settings} setSettings={setSettings} projectId={project.id} />
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// General Tab Component
const GeneralTab: React.FC<{ project: Project }> = ({ project }) => {
    return (
        <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                    <p className="text-gray-900">{project.name}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <p className="text-gray-600">{project.description || 'No description'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Members</label>
                    <p className="text-gray-600">{project.stats.members} member(s)</p>
                </div>
            </div>
        </div>
    );
};

// Test Cases Tab Component
const TestCasesTab: React.FC<{
    settings: ProjectSettings;
    setSettings: React.Dispatch<React.SetStateAction<ProjectSettings>>;
}> = ({ settings, setSettings }) => {
    const toggleHiddenField = (field: string) => {
        setSettings((prev) => ({
            ...prev,
            testCases: {
                ...prev.testCases,
                hiddenDefaultFields: {
                    ...prev.testCases?.hiddenDefaultFields,
                    [field]: !prev.testCases?.hiddenDefaultFields?.[field as keyof typeof prev.testCases.hiddenDefaultFields],
                },
            },
        }));
    };

    const toggleHiddenColumn = (column: string) => {
        setSettings((prev) => ({
            ...prev,
            testCases: {
                ...prev.testCases,
                table: {
                    ...prev.testCases?.table,
                    hiddenDefaultColumns: {
                        ...prev.testCases?.table?.hiddenDefaultColumns,
                        [column]: !prev.testCases?.table?.hiddenDefaultColumns?.[column as keyof typeof prev.testCases.table.hiddenDefaultColumns],
                    },
                },
            },
        }));
    };

    const defaultFields = [
        { key: 'area', label: 'Page / Area' },
        { key: 'testDescription', label: 'Test Description' },
        { key: 'stepsContent', label: 'Test Steps' },
        { key: 'expectedResult', label: 'Expected Result' },
        { key: 'comments', label: 'Comments' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'assignedTester', label: 'Assigned Tester' },
    ];

    const defaultColumns = [
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'lastModified', label: 'Last Modified' },
        { key: 'assignedTester', label: 'Assigned Tester' },
    ];

    return (
        <div className="space-y-6">
            {/* Hidden Form Fields */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Form Fields</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Hide fields from the test case create/edit form. Note: Title, Project, and Test Suite cannot be hidden.
                </p>
                <div className="space-y-2">
                    {defaultFields.map((field) => (
                        <label key={field.key} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.testCases?.hiddenDefaultFields?.[field.key as keyof typeof settings.testCases.hiddenDefaultFields] || false}
                                onChange={() => toggleHiddenField(field.key)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{field.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Hidden Table Columns */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Table Columns</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Hide columns from the test case table view.
                </p>
                <div className="space-y-2">
                    {defaultColumns.map((column) => (
                        <label key={column.key} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.testCases?.table?.hiddenDefaultColumns?.[column.key as keyof typeof settings.testCases.table.hiddenDefaultColumns] || false}
                                onChange={() => toggleHiddenColumn(column.key)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{column.label}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Custom Fields Tab Component
const CustomFieldsTab: React.FC<{
    settings: ProjectSettings;
    setSettings: React.Dispatch<React.SetStateAction<ProjectSettings>>;
    projectId: string;
}> = ({ settings, setSettings, projectId }) => {
    const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

    const addCustomField = () => {
        const newField: CustomFieldDefinition = {
            id: `field_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false,
            showOnTableByDefault: false,
            order: settings.testCases?.customFields?.length || 0,
        };
        setEditingField(newField);
    };

    const saveField = (field: CustomFieldDefinition) => {
        setSettings((prev) => {
            const existingFields = prev.testCases?.customFields || [];
            const existingIndex = existingFields.findIndex((f) => f.id === field.id);
            
            if (existingIndex >= 0) {
                // Update existing field
                const updated = [...existingFields];
                updated[existingIndex] = field;
                return {
                    ...prev,
                    testCases: {
                        ...prev.testCases,
                        customFields: updated,
                    },
                };
            } else {
                // Add new field
                return {
                    ...prev,
                    testCases: {
                        ...prev.testCases,
                        customFields: [...existingFields, field],
                    },
                };
            }
        });
        setEditingField(null);
    };

    const softDeleteField = (fieldId: string) => {
        setSettings((prev) => ({
            ...prev,
            testCases: {
                ...prev.testCases,
                customFields: prev.testCases?.customFields?.map((f) => 
                    f.id === fieldId 
                        ? { ...f, deleted: true, deletedAt: new Date().toISOString() }
                        : f
                ) || [],
                table: {
                    ...prev.testCases?.table,
                    visibleCustomFieldIds: prev.testCases?.table?.visibleCustomFieldIds?.filter((id) => id !== fieldId) || [],
                },
            },
        }));
        toast.success('Field moved to deleted fields');
    };

    const restoreField = (fieldId: string) => {
        setSettings((prev) => ({
            ...prev,
            testCases: {
                ...prev.testCases,
                customFields: prev.testCases?.customFields?.map((f) => 
                    f.id === fieldId 
                        ? { ...f, deleted: false, deletedAt: undefined }
                        : f
                ) || [],
            },
        }));
        toast.success('Field restored');
    };

    const permanentlyDeleteField = async (fieldId: string) => {
        if (!projectId) return;
        
        if (!confirm('This will permanently delete this field and ALL its data from all test cases. This cannot be undone. Are you sure?')) {
            return;
        }

        try {
            const { permanentlyDeleteCustomFieldData } = await import('../../services/testManagerApi');
            const result = await permanentlyDeleteCustomFieldData(projectId, fieldId);
            
            // Remove from settings
            setSettings((prev) => ({
                ...prev,
                testCases: {
                    ...prev.testCases,
                    customFields: prev.testCases?.customFields?.filter((f) => f.id !== fieldId) || [],
                    table: {
                        ...prev.testCases?.table,
                        visibleCustomFieldIds: prev.testCases?.table?.visibleCustomFieldIds?.filter((id) => id !== fieldId) || [],
                    },
                },
            }));
            
            toast.success(`Field permanently deleted. ${result.deletedCount} test case(s) updated.`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete field');
        }
    };

    const toggleFieldVisibility = (fieldId: string) => {
        setSettings((prev) => {
            const visibleIds = prev.testCases?.table?.visibleCustomFieldIds || [];
            const isVisible = visibleIds.includes(fieldId);
            
            return {
                ...prev,
                testCases: {
                    ...prev.testCases,
                    table: {
                        ...prev.testCases?.table,
                        visibleCustomFieldIds: isVisible
                            ? visibleIds.filter((id) => id !== fieldId)
                            : [...visibleIds, fieldId],
                    },
                },
            };
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Add custom fields to test cases. These will appear in the form and can be shown in the table.
                        </p>
                    </div>
                    <button
                        onClick={addCustomField}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Field
                    </button>
                </div>

                {/* Active Custom Fields */}
                {settings.testCases?.customFields && settings.testCases.customFields.filter(f => !f.deleted).length > 0 ? (
                    <div className="space-y-3">
                        {settings.testCases.customFields.filter(f => !f.deleted).map((field) => (
                            <div key={field.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                                <GripVertical className="w-5 h-5 text-gray-400" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{field.label}</span>
                                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                            {field.type.replace('_', ' ')}
                                        </span>
                                        {field.required && (
                                            <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">Required</span>
                                        )}
                                    </div>
                                    {field.key && (
                                        <p className="text-sm text-gray-500 mt-1">Key: {field.key}</p>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={settings.testCases?.table?.visibleCustomFieldIds?.includes(field.id) || false}
                                        onChange={() => toggleFieldVisibility(field.id)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    Show in table
                                </label>
                                <button
                                    onClick={() => setEditingField(field)}
                                    className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => softDeleteField(field.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Move to deleted fields"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <p>No custom fields defined yet.</p>
                        <p className="text-sm mt-1">Click "Add Field" to create your first custom field.</p>
                    </div>
                )}

                {/* Deleted Fields Section */}
                {settings.testCases?.customFields && settings.testCases.customFields.filter(f => f.deleted).length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-base font-semibold text-gray-700 mb-4">Deleted Fields</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            These fields are hidden but their data is preserved. You can restore them or permanently delete them.
                        </p>
                        <div className="space-y-3">
                            {settings.testCases.customFields.filter(f => f.deleted).map((field) => (
                                <div key={field.id} className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{field.label}</span>
                                            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                                                {field.type.replace('_', ' ')}
                                            </span>
                                            {field.deletedAt && (
                                                <span className="text-xs text-gray-500">
                                                    Deleted {new Date(field.deletedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        {field.key && (
                                            <p className="text-sm text-gray-500 mt-1">Key: {field.key}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => restoreField(field.id)}
                                        className="px-3 py-1.5 text-sm text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors"
                                    >
                                        Restore
                                    </button>
                                    <button
                                        onClick={() => permanentlyDeleteField(field.id)}
                                        className="px-3 py-1.5 text-sm text-red-700 bg-red-200 hover:bg-red-300 rounded transition-colors"
                                    >
                                        Delete Forever
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Field Editor Modal */}
            {editingField && (
                <CustomFieldEditor
                    field={editingField}
                    onSave={saveField}
                    onCancel={() => setEditingField(null)}
                />
            )}
        </div>
    );
};

// Custom Field Editor Modal
const CustomFieldEditor: React.FC<{
    field: CustomFieldDefinition;
    onSave: (field: CustomFieldDefinition) => void;
    onCancel: () => void;
}> = ({ field: initialField, onSave, onCancel }) => {
    const [field, setField] = useState<CustomFieldDefinition>(initialField);

    const addOption = () => {
        const newOption: CustomFieldOption = {
            id: `opt_${Date.now()}`,
            label: 'New Option',
        };
        setField((prev) => ({
            ...prev,
            options: [...(prev.options || []), newOption],
        }));
    };

    const updateOption = (optionId: string, label: string) => {
        setField((prev) => ({
            ...prev,
            options: prev.options?.map((opt) => (opt.id === optionId ? { ...opt, label } : opt)),
        }));
    };

    const deleteOption = (optionId: string) => {
        setField((prev) => ({
            ...prev,
            options: prev.options?.filter((opt) => opt.id !== optionId),
        }));
    };

    const handleSave = () => {
        if (!field.label.trim()) {
            toast.error('Field label is required');
            return;
        }
        if (field.type === 'dropdown' && (!field.options || field.options.length === 0)) {
            toast.error('Dropdown fields must have at least one option');
            return;
        }
        onSave(field);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            
            <div className="relative bg-white max-w-2xl w-full rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    {initialField.label === 'New Field' ? 'Add Custom Field' : 'Edit Custom Field'}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Field Label *</label>
                        <input
                            type="text"
                            value={field.label}
                            onChange={(e) => setField({ ...field, label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter field label"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Key (optional)</label>
                        <input
                            type="text"
                            value={field.key || ''}
                            onChange={(e) => setField({ ...field, key: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="field_key"
                        />
                        <p className="text-xs text-gray-500 mt-1">Used for API/exports. Auto-generated if not provided.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Field Type *</label>
                        <select
                            value={field.type}
                            onChange={(e) => setField({ ...field, type: e.target.value as CustomFieldDefinition['type'] })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="text">Text (single line)</option>
                            <option value="long_text">Long Text (multi-line)</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="wysiwyg">WYSIWYG Editor</option>
                        </select>
                    </div>

                    {field.type === 'dropdown' && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Options *</label>
                                <button
                                    onClick={addOption}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    + Add Option
                                </button>
                            </div>
                            <div className="space-y-2">
                                {field.options?.map((option) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={option.label}
                                            onChange={(e) => updateOption(option.id, e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Option label"
                                        />
                                        <button
                                            onClick={() => deleteOption(option.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={field.required || false}
                                onChange={(e) => setField({ ...field, required: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Required field</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={field.showOnTableByDefault || false}
                                onChange={(e) => setField({ ...field, showOnTableByDefault: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Show on table by default</span>
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Save Field
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettingsModal;
