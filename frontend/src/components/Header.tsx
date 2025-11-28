import React from "react";
import { useAuthStore } from "../store/authStore";
import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user } = useAuthStore();

  return (
    <header className="glass-panel sticky top-0 z-10 border-b border-white/20">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: menu + search - allow this region to shrink so right-side icons are never cropped */}
        <div className="flex items-center flex-1 min-w-0">
          <button
            onClick={toggleSidebar}
            className="mr-3 text-gray-500 hover:text-gray-700 lg:hidden flex-shrink-0"
          >
            <Menu size={20} />
          </button>
          <div className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search..."
              className="mac-input w-full min-w-0 pl-9 pr-4 py-1.5 text-sm bg-white/50 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 flex-shrink-0">
          <button className="p-2 text-gray-500 hover:text-gray-700 relative transition-colors rounded-full hover:bg-black/5">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-system-red rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center space-x-3 pl-2 border-l border-gray-200/50">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 leading-none">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 mt-1">Admin</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-system-blue to-system-indigo flex items-center justify-center text-white font-semibold shadow-sm text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
