
import React from 'react';
import { Plus, Filter, Download, FilePlus, PenLine, Check } from 'lucide-react';
import { ViewMode } from '../types';

interface ToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNew: () => void;
  onNewCase: () => void;
  activeSuite?: string | null;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  showEditToggle?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  viewMode, 
  setViewMode, 
  onNew, 
  onNewCase, 
  activeSuite,
  isEditMode,
  onToggleEditMode,
  showEditToggle
}) => {
  const getTitle = () => {
    if (activeSuite) return activeSuite;
    switch(viewMode) {
      case 'projects': return 'Projects';
      case 'suites': return 'Test Suites';
      case 'plans': return 'Test Plans';
      default: return 'Test Cases';
    }
  };

  // Helper to determine button text
  const getNewButtonText = () => {
    if (viewMode === 'projects') return 'Project';
    if (viewMode === 'suites') return 'Suite';
    return 'Case';
  };

  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{getTitle()}</h1>
        
        {/* iOS Style Segmented Control */}
        <div className="bg-gray-100 p-0.5 rounded-lg flex items-center h-8 ml-4">
          {(['projects', 'cases', 'suites'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-0.5 text-xs font-medium rounded-md capitalize transition-all duration-200 ${
                viewMode === mode && !activeSuite
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onNewCase}
          className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors mr-1"
          title="Quick Add Test Case"
        >
          <FilePlus className="h-5 w-5" strokeWidth={1.5} />
        </button>
        
        <div className="h-6 w-px bg-gray-200 mx-1"></div>

        {showEditToggle && (
           <button 
            onClick={onToggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${
              isEditMode 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isEditMode ? (
              <>
                <Check className="h-4 w-4" />
                <span>Done</span>
              </>
            ) : (
              <>
                <PenLine className="h-4 w-4" />
                <span>Edit</span>
              </>
            )}
          </button>
        )}

        <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
          <Filter className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
          <Download className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button 
          onClick={onNew}
          className="ml-2 flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 text-sm font-medium"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          <span>New {getNewButtonText()}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
