
import React from 'react';
import { Status, Priority } from '../types';

interface StatusBadgeProps {
  type: 'status' | 'priority';
  value: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  if (type === 'status') {
    let colorClass = 'bg-gray-100 text-gray-600';
    
    if (value === Status.Draft) colorClass = 'bg-gray-100 text-gray-500';
    if (value === Status.Passed) colorClass = 'bg-green-100 text-green-700';
    if (value === Status.Failed) colorClass = 'bg-red-100 text-red-700';
    if (value === Status.Skipped) colorClass = 'bg-gray-50 text-gray-400';
    if (value === Status.Retest) colorClass = 'bg-yellow-100 text-yellow-700';
    if (value === Status.PassFixed) colorClass = 'bg-teal-100 text-teal-700';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${colorClass}`}>
        {value}
      </span>
    );
  }

  if (type === 'priority') {
    let color = 'bg-gray-400';
    if (value === Priority.Low) color = 'bg-blue-400';
    if (value === Priority.Medium) color = 'bg-yellow-400';
    if (value === Priority.High) color = 'bg-orange-500';
    if (value === Priority.Critical) color = 'bg-red-500';

    return (
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color} shadow-sm`} />
        <span className="text-sm text-gray-700">{value}</span>
      </div>
    );
  }

  return null;
};

export default StatusBadge;
