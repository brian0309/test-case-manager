
import React from 'react';
import { TestCase, Priority, Status } from '../types';
import StatusBadge from './StatusBadge';

interface TestCaseTableProps {
  data: TestCase[];
  onRowClick: (item: TestCase) => void;
  onStatusChange?: (caseId: string, status: Status) => void;
  isEditMode?: boolean;
  onUpdate?: (id: string, field: keyof TestCase, value: any) => void;
}

const TestCaseTable: React.FC<TestCaseTableProps> = ({ 
  data, 
  onRowClick, 
  onStatusChange,
  isEditMode = false,
  onUpdate
}) => {
  
  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.Passed: return 'bg-green-100 text-green-700 border-green-200';
      case Status.PassFixed: return 'bg-teal-100 text-teal-700 border-teal-200';
      case Status.Failed: return 'bg-red-100 text-red-700 border-red-200';
      case Status.Retest: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case Status.Skipped: return 'bg-gray-50 text-gray-400 border-gray-200';
      case Status.Draft: return 'bg-gray-50 text-gray-500 border-gray-200';
      default: return 'bg-gray-50 text-gray-400 border-transparent';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <tr>
            <th className="py-3 pl-6 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-24">ID</th>
            <th className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3">Title</th>
            <th className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-24 text-center">Steps</th>
            <th className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32">Priority</th>
            <th className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-40">Status</th>
            <th className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32 text-right pr-6">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item) => {
            return (
              <tr 
                key={item.id} 
                onClick={() => onRowClick(item)}
                className={`group transition-colors ${isEditMode ? '' : 'cursor-pointer'} hover:bg-gray-50/80`}
              >
                <td className="py-4 pl-6 pr-4 text-sm font-medium text-gray-500 font-mono tracking-tight group-hover:text-gray-900">
                  {item.id}
                </td>
                
                {/* Title Cell: Editable or Text */}
                <td className="py-4 px-4">
                  {isEditMode ? (
                     <div onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="text"
                          value={item.title}
                          onChange={(e) => onUpdate?.(item.id, 'title', e.target.value)}
                          className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none"
                        />
                        <div className="text-xs text-gray-400 mt-1">{item.suite}</div>
                     </div>
                  ) : (
                    <>
                      <div className="text-[15px] font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.suite}</div>
                    </>
                  )}
                </td>

                <td className="py-4 px-4 text-sm text-gray-500 text-center">
                  <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">
                    {item.steps.length}
                  </span>
                </td>

                {/* Priority: Editable or Badge */}
                <td className="py-4 px-4">
                  {isEditMode ? (
                    <div onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={item.priority}
                          onChange={(e) => onUpdate?.(item.id, 'priority', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-300"
                        >
                          {Object.values(Priority).map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                    </div>
                  ) : (
                    <StatusBadge type="priority" value={item.priority} />
                  )}
                </td>
                
                {/* Unified Status Dropdown */}
                <td className="py-4 px-4">
                  <div className="flex flex-col items-start gap-1" onClick={e => e.stopPropagation()}>
                     <select 
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value as Status)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border appearance-none cursor-pointer outline-none transition-colors text-center min-w-[90px] ${getStatusColor(item.status)}`}
                      >
                        <option value={Status.Draft}>Draft</option>
                        <option value={Status.Passed}>Passed</option>
                        <option value={Status.Failed}>Failed</option>
                        <option value={Status.PassFixed}>Pass - Fixed</option>
                        <option value={Status.Retest}>Retest</option>
                        <option value={Status.Skipped}>Skipped</option>
                      </select>
                      {/* Show Last Run Date only if it's an execution status */}
                      {item.status !== Status.Draft && (
                        <span className="text-[10px] text-gray-400 pl-1">
                            {new Date(item.lastRun).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                  </div>
                </td>

                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-gray-600 truncate max-w-[100px]">{item.assignedTester.name}</span>
                    <img 
                      src={item.assignedTester.avatar} 
                      alt={item.assignedTester.name} 
                      className="h-6 w-6 rounded-full border border-gray-200"
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
         <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p>No test cases found</p>
         </div>
      )}
    </div>
  );
};

export default TestCaseTable;
