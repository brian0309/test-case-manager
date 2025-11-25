
import React from 'react';
import { TestRun } from '../types';
import { PlayCircle, MoreHorizontal, Calendar, PieChart, Plus } from 'lucide-react';

interface TestRunListProps {
  runs: TestRun[];
  onRunClick: (run: TestRun) => void;
  onCreate: () => void;
}

const TestRunList: React.FC<TestRunListProps> = ({ runs, onRunClick, onCreate }) => {
  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Create New Run Card */}
        <div 
          onClick={onCreate}
          className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[180px]"
        >
          <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
             <Plus className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Start New Test Run</h3>
          <p className="text-xs text-gray-500 mt-1 text-center">Execute a set of cases</p>
        </div>

        {runs.map(run => (
          <div 
            key={run.id} 
            onClick={() => onRunClick(run)}
            className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${run.status === 'Completed' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'}`}>
                  <PlayCircle className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg tracking-tight">{run.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    run.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {run.status}
                  </span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }} 
                className="p-2 text-gray-300 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                 <span>Progress</span>
                 <span className="font-medium text-gray-900">{run.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                 <div 
                  className={`h-full rounded-full transition-all duration-500 ${run.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`} 
                  style={{ width: `${run.progress}%` }} 
                 />
              </div>

              <div className="flex items-center justify-between pt-2">
                 <div className="flex items-center gap-2">
                    <img src={run.assignedTo.avatar} className="h-6 w-6 rounded-full border border-gray-200" alt="assignee" />
                    <span className="text-xs text-gray-600">{run.assignedTo.name}</span>
                 </div>
                 <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <PieChart className="h-3.5 w-3.5" />
                      {run.caseResults.length} Cases
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Due {new Date(run.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestRunList;
