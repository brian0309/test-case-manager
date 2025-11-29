import React from "react";
import { useAuthStore } from "../store/authStore";
import { useTestManagerStore } from "../store/testManagerStore";
import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery, clearSearchQuery } = useTestManagerStore();

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
          <div className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg group">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="searchbar-input w-full min-w-0 pl-4 pr-12 py-2 text-base bg-white/70 focus:bg-white border border-gray-200 focus:border-system-blue shadow-sm focus:shadow-md rounded-xl transition-all duration-200"
              aria-label="Search"
            />

            {searchQuery && (
              <button
                onClick={clearSearchQuery}
                className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">Clear search</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-system-blue transition-colors" size={18} aria-hidden />
            </span>
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
