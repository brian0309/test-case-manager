import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface IdDisplayProps {
    id: string;
    className?: string;
    showCopyOnHover?: boolean;
    truncateLength?: number;
}

const IdDisplay: React.FC<IdDisplayProps> = ({
    id,
    className = "",
    showCopyOnHover = true,
    truncateLength = 6
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Show last N chars, prefixed with ellipsis if longer
    const displayId = id.length > truncateLength ? '..' + id.slice(-truncateLength) : id;

    return (
        <div className={`flex items-center gap-2 group/id relative ${className}`}>
            <span title={id} className="font-mono">{displayId}</span>
            <button
                onClick={handleCopy}
                className={`p-1 rounded transition-all ${copied
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 opacity-100'
                    : `text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${showCopyOnHover ? 'opacity-0 group-hover/id:opacity-100' : 'opacity-100'}`
                    }`}
                title="Copy ID"
            >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
        </div>
    );
};

export default IdDisplay;
