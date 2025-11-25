
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import TestCaseTable from './components/TestCaseTable';
import TestCaseModal from './components/TestCaseModal';
import TestSuiteList from './components/TestSuiteList';
import ProjectList from './components/ProjectList';
import { mockTestCases, mockProjects } from './utils/mockData';
import { TestCase, ViewMode, Priority, Status, Project } from './types';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [testCases, setTestCases] = useState<TestCase[]>(mockTestCases);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [activeSuite, setActiveSuite] = useState<string | null>(null);

  // Edit Mode State
  const [isListEditMode, setIsListEditMode] = useState(false);

  // Derived state for available areas
  const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

  const handleRowClick = (item: TestCase) => {
    if (isListEditMode) return;
    setSelectedCase(item);
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    setActiveSuite(null);
    setIsListEditMode(false);
  };

  const handleSuiteClick = (suite: string) => {
    setActiveSuite(suite);
    setViewMode('cases');
  };

  const handleProjectClick = (projectId: string) => {
    setViewMode('suites');
  };

  const handleCreateSuite = () => {
    const name = prompt("Enter a name for the new Test Suite:");
    if (!name) return;

    const newCase: TestCase = {
      id: `TC-${100 + testCases.length + 1}`,
      title: 'First Case in ' + name,
      priority: Priority.Medium,
      status: Status.Draft,
      lastRun: new Date().toISOString(),
      assignedTester: {
        id: 'u-me',
        name: 'You',
        avatar: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
      },
      suite: name,
      steps: []
    };
    setTestCases([newCase, ...testCases]);
    setActiveSuite(name);
    setViewMode('cases');
  };

  const handleCreateProject = () => {
    const name = prompt("Enter Project Name:");
    if (!name) return;
    
    const newProject: Project = {
      id: `p-${Date.now()}`,
      name: name,
      description: 'New project workspace',
      color: 'bg-gray-500',
      stats: { suites: 0, cases: 0, members: 1 },
      updatedAt: new Date().toISOString()
    };
    setProjects([newProject, ...projects]);
  };

  const createNewTestCase = () => {
    const newCase: TestCase = {
      id: `TC-${100 + testCases.length + 1}`,
      title: 'New Test Case',
      priority: Priority.Medium,
      status: Status.Draft,
      lastRun: new Date().toISOString(),
      assignedTester: {
        id: 'u-current',
        name: 'You',
        avatar: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
      },
      suite: activeSuite || 'Unassigned',
      steps: []
    };
    setSelectedCase(newCase);
  };

  const handlePrimaryAction = () => {
    if (viewMode === 'suites') {
      handleCreateSuite();
      return;
    }
    if (viewMode === 'projects') {
      handleCreateProject();
      return;
    }
    createNewTestCase();
  };

  const handleSaveCase = (updatedCase: TestCase) => {
    setTestCases(prev => {
      const exists = prev.find(c => c.id === updatedCase.id);
      if (exists) {
        return prev.map(c => c.id === updatedCase.id ? updatedCase : c);
      }
      return [updatedCase, ...prev];
    });
    setSelectedCase(null);
  };

  // Inline update handler for the Table Edit Mode
  const handleInlineUpdate = (caseId: string, field: keyof TestCase, value: any) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === caseId ? { ...tc, [field]: value } : tc
    ));
  };

  const handleStatusChange = (caseId: string, status: Status) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === caseId ? { 
        ...tc, 
        status: status,
        lastRun: new Date().toISOString() 
      } : tc
    ));
  };

  // Filter logic
  let displayedCases = testCases;

  if (activeSuite) {
    displayedCases = testCases.filter(c => c.suite === activeSuite);
  }

  return (
    <div className="flex h-screen bg-[#f5f5f7] font-sans overflow-hidden text-gray-900">
      <Sidebar currentView={viewMode} onViewChange={handleViewChange} />
      
      <main className="flex-1 flex flex-col min-w-0 bg-white rounded-tl-2xl shadow-[-1px_0_20px_rgba(0,0,0,0.05)] border-l border-gray-200/50 overflow-hidden relative my-2 mr-2">
        <Toolbar 
          viewMode={viewMode} 
          setViewMode={handleViewChange} 
          onNew={handlePrimaryAction}
          onNewCase={createNewTestCase}
          activeSuite={activeSuite}
          isEditMode={isListEditMode}
          onToggleEditMode={() => setIsListEditMode(!isListEditMode)}
          showEditToggle={viewMode === 'cases'}
        />
        
        <div className="flex-1 overflow-auto relative">
           {viewMode === 'projects' && (
             <ProjectList
               projects={projects}
               onProjectClick={handleProjectClick}
               onCreate={handleCreateProject}
             />
           )}
           
           {viewMode === 'cases' && (
             <TestCaseTable 
                data={displayedCases} 
                onRowClick={handleRowClick} 
                isEditMode={isListEditMode}
                onUpdate={handleInlineUpdate}
                onStatusChange={handleStatusChange}
             />
           )}
           
           {viewMode === 'suites' && (
             <TestSuiteList 
                testCases={testCases} 
                onSuiteClick={handleSuiteClick}
                onCreate={handleCreateSuite}
             />
           )}

           {viewMode === 'plans' && (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <p>Test Plans view coming soon...</p>
             </div>
           )}
        </div>
      </main>

      {selectedCase && (
        <TestCaseModal 
          testCase={selectedCase} 
          availableAreas={uniqueAreas}
          onClose={() => setSelectedCase(null)}
          onSave={handleSaveCase}
        />
      )}
    </div>
  );
};

export default App;
