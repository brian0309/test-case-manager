
import React from 'react';
import {
    ListChecks,
    Folder,
    Settings,
    Search,
    ChevronRight,
    Inbox,
    Layers
} from 'lucide-react';
import { ViewMode } from '../../types/testManager';

interface SidebarProps {
    currentView: ViewMode;
    onViewChange: (mode: ViewMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    const menuItems = [
        { id: 'projects', icon: Layers, label: 'Projects' },
        { id: 'cases', icon: Inbox, label: 'All Cases' },
        { id: 'suites', icon: Folder, label: 'Test Suites' },
        { id: 'plans', icon: ListChecks, label: 'Plans' },
    ];

    const categories = ['Authentication', 'Checkout', 'User Profile', 'Settings', 'API'];

    return (
        <div className="w-64 flex-shrink-0 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200 h-full flex flex-col pt-5 select-none">
            {/* Search mimicking Spotlight/Apple Mail */}
            <div className="px-4 mb-6">
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full bg-gray-200/50 hover:bg-gray-200/80 focus:bg-white border border-transparent focus:border-blue-400/50 focus:ring-4 focus:ring-blue-100 text-sm rounded-lg pl-9 pr-3 py-1.5 transition-all outline-none placeholder:text-gray-500"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-6">
                {/* Main Navigation */}
                <section>
                    <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Library</h3>
                    <ul className="space-y-0.5">
                        {menuItems.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => onViewChange(item.id as ViewMode)}
                                    className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${currentView === item.id
                                            ? 'bg-blue-500 text-white font-medium shadow-sm'
                                            : 'text-gray-700 hover:bg-gray-200/60'
                                        }`}
                                >
                                    <item.icon className={`h-4 w-4 ${currentView === item.id ? 'text-white' : 'text-gray-500'}`} strokeWidth={2} />
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Collapsible Section Style */}
                <section>
                    <div className="flex items-center px-3 mb-1 group cursor-pointer">
                        <ChevronRight className="h-3 w-3 text-gray-400 mr-1 group-hover:text-gray-600 transition-transform duration-200 rotate-90" />
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600">Suites</h3>
                    </div>
                    <ul className="space-y-0.5 ml-1">
                        {categories.map((cat) => (
                            <li key={cat}>
                                <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-200/60 transition-colors">
                                    <Folder className="h-4 w-4 text-blue-400/80" strokeWidth={2} />
                                    {cat}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors w-full">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
