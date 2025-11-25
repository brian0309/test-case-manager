
import React from 'react';
import { TestCase, Status } from '../types';
import { Folder, MoreHorizontal, PieChart, AlertCircle, Plus } from 'lucide-react';

interface TestSuiteListProps {
  testCases: TestCase[];
  onSuiteClick: (suite: string) => void;
  onCreate: () => void;
}

const TestSuiteList: React.FC<TestSuiteListProps> = ({ testCases, onSuiteClick, onCreate }) => {
  const suites: string[] = Array.from(new Set(testCases.map(tc => tc.suite))).sort();

  const getSuiteStats = (suiteName: string) => {
    const cases = testCases.filter(c => c.suite === suiteName);
    const total = cases.length;
    
    // Execution Status - Check unified status field
    const passed = cases.filter(c => [Status.Passed, Status.PassFixed].includes(c.status)).length;
    const failed = cases.filter(c => [Status.Failed].includes(c.status)).length;
    
    // Progress % (Count passed against total for simplicity)
    const progress = total === 0 ? 0 : Math.round((passed / total) * 100);

    return { total, passed, failed, progress };
  };

  return (
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
          const stats = getSuiteStats(suite);
          
          return (
            <div 
              key={suite} 
              onClick={() => onSuiteClick(suite)}
              className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                      <Folder className="h-5 w-5 fill-blue-100" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg tracking-tight">{suite}</h3>
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stats.total} Cases</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); }} 
                    className="p-2 text-gray-300 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-2">
                  <div className="flex items-center justify-between text-sm">
                     <span className="font-medium text-gray-700">Progress</span>
                     <span className={`font-semibold ${stats.progress === 100 ? 'text-green-600' : 'text-gray-900'}`}>{stats.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                     <div 
                      className="bg-green-500 h-full transition-all duration-500" 
                      style={{ width: `${stats.progress}%` }} 
                     />
                     {stats.failed > 0 && (
                        <div 
                        className="bg-red-500 h-full transition-all duration-500 border-l border-white" 
                        style={{ width: `${(stats.failed / stats.total) * 100}%` }} 
                        />
                     )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50 mt-4">
                  {stats.failed > 0 ? (
                     <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1.5 rounded-full">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {stats.failed} Failed
                     </div>
                  ) : (
                     <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 px-2 py-1.5">
                        <PieChart className="h-3.5 w-3.5" />
                        No failures
                     </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestSuiteList;
