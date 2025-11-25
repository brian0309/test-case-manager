import React, { useState, useEffect, useRef } from 'react';
import { TestCase, Priority, Status } from '../types';
import { X, Wand2, Plus, ChevronDown } from 'lucide-react';
import { generateTestSteps } from '../services/geminiService';
import RichTextEditor from './RichTextEditor';

interface TestCaseModalProps {
  testCase: TestCase | null;
  availableAreas: string[];
  onClose: () => void;
  onSave: (updatedCase: TestCase) => void;
}

const TestCaseModal: React.FC<TestCaseModalProps> = ({ testCase, availableAreas, onClose, onSave }) => {
  const [localCase, setLocalCase] = useState<TestCase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Combobox state
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalCase(testCase);
  }, [testCase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
        setIsAreaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!testCase || !localCase) return null;

  const handleGenerateSteps = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const newSteps = await generateTestSteps(localCase.title);
      
      // Convert structured steps to HTML for the editor
      const stepsHtml = newSteps.map(s => `
        <li>
          <p><strong>Action:</strong> ${s.action}</p>
          <p><em>Expected:</em> ${s.expectedResult}</p>
        </li>
      `).join('');
      
      const newContent = (localCase.stepsContent || '') + `<ol>${stepsHtml}</ol>`;

      setLocalCase(prev => prev ? ({ 
        ...prev, 
        steps: [...prev.steps, ...newSteps], // Keep structured for legacy if needed
        stepsContent: newContent 
      }) : null);

    } catch (err) {
      setError("Could not generate steps. Check API Key configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalCase(prev => prev ? ({ ...prev, title: e.target.value }) : null);
  };

  const handleExpectedResultChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalCase(prev => prev ? ({ ...prev, expectedResult: e.target.value }) : null);
  };

  // Filter areas for dropdown
  const filteredAreas = availableAreas.filter(a => 
    a.toLowerCase().includes((localCase.area || '').toLowerCase())
  );

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.Passed: return 'text-green-700 bg-green-50 border-green-200';
      case Status.PassFixed: return 'text-teal-700 bg-teal-50 border-teal-200';
      case Status.Failed: return 'text-red-700 bg-red-50 border-red-200';
      case Status.Retest: return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case Status.Skipped: return 'text-gray-500 bg-gray-50 border-gray-200';
      case Status.Draft: return 'text-gray-500 bg-gray-50 border-gray-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.Low: return 'text-blue-700 bg-blue-50 border-blue-200';
      case Priority.Medium: return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case Priority.High: return 'text-orange-700 bg-orange-50 border-orange-200';
      case Priority.Critical: return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[scaleIn_0.2s_ease-out]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{localCase.id}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mb-8">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title</label>
            <input 
              type="text" 
              value={localCase.title}
              onChange={handleTitleChange}
              className="w-full text-2xl font-semibold text-gray-900 border-none p-0 focus:ring-0 placeholder:text-gray-300 bg-transparent"
              placeholder="Test Case Title"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assignee</label>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50/50 border border-transparent">
                <img src={localCase.assignedTester.avatar} className="h-6 w-6 rounded-full" alt="avatar" />
                <span className="text-sm text-gray-700 font-medium">{localCase.assignedTester.name}</span>
              </div>
            </div>

            {/* Priority (Editable) */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
              <div className="relative">
                <select 
                  value={localCase.priority}
                  onChange={(e) => setLocalCase(prev => prev ? ({ ...prev, priority: e.target.value as Priority }) : null)}
                  className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getPriorityColor(localCase.priority)}`}
                >
                  {Object.values(Priority).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
              </div>
            </div>

            {/* Status (Editable) */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</label>
              <div className="relative">
                <select 
                  value={localCase.status}
                  onChange={(e) => setLocalCase(prev => prev ? ({ ...prev, status: e.target.value as Status }) : null)}
                  className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getStatusColor(localCase.status)}`}
                >
                  {Object.values(Status).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
              </div>
            </div>
          </div>
          
          {/* Searchable Page/Area Input - Moved below grid */}
          <div className="mb-8">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Page / Area</label>
              <div className="relative" ref={areaRef}>
                <div className="flex items-center gap-2">
                   <div className="relative w-full group">
                     <input 
                        type="text" 
                        value={localCase.area || ''} 
                        onChange={(e) => {
                          setLocalCase(prev => prev ? ({ ...prev, area: e.target.value }) : null);
                          setIsAreaDropdownOpen(true);
                        }}
                        onFocus={() => setIsAreaDropdownOpen(true)}
                        placeholder="Select or type..."
                        className="w-full text-sm font-medium text-gray-700 border-b border-gray-200 focus:border-blue-500 pb-1.5 focus:ring-0 placeholder:text-gray-300 bg-transparent outline-none pr-6 transition-all"
                      />
                      <ChevronDown className="absolute right-0 top-0 h-4 w-4 text-gray-300 group-hover:text-gray-500 pointer-events-none transition-colors" />
                   </div>
                   
                   <button 
                     onClick={() => {
                        setLocalCase(prev => prev ? ({ ...prev, area: '' }) : null);
                        setIsAreaDropdownOpen(true);
                     }}
                     className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                     title="New / Clear"
                   >
                     <Plus className="h-4 w-4" />
                   </button>
                </div>

                {/* Dropdown Menu */}
                {isAreaDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                      {filteredAreas.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                           Type to create "{localCase.area}"
                        </div>
                      ) : (
                        filteredAreas.map(area => (
                          <button
                            key={area}
                            onClick={() => {
                              setLocalCase(prev => prev ? ({ ...prev, area: area }) : null);
                              setIsAreaDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between group/item"
                          >
                            <span>{area}</span>
                            {localCase.area === area && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Test Steps</h3>
            <div className="flex gap-2">
               <button 
                  onClick={handleGenerateSteps}
                  disabled={isGenerating || !process.env.API_KEY}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    !process.env.API_KEY ? 'hidden' : 
                    isGenerating 
                      ? 'bg-purple-100 text-purple-700 cursor-wait' 
                      : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  <Wand2 className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'AI Generate'}
               </button>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <div className="mb-8">
            <RichTextEditor 
              content={localCase.stepsContent || ''}
              onChange={(html) => setLocalCase(prev => prev ? ({ ...prev, stepsContent: html }) : null)}
              placeholder="Describe the test steps here. You can use lists, bold text, etc."
            />
          </div>

          {/* Moved Expected Result to bottom */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected Result (Summary)</label>
            <textarea 
              value={localCase.expectedResult || ''}
              onChange={handleExpectedResultChange}
              className="w-full text-sm text-gray-700 bg-gray-50 border-transparent rounded-lg focus:border-blue-300 focus:bg-white focus:ring-0 p-3 transition-colors resize-none"
              rows={3}
              placeholder="What is the high-level expected outcome of this test case?"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(localCase!)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 shadow-sm shadow-blue-200 transition-all active:scale-95"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestCaseModal;