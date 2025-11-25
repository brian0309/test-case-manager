import React from "react";
import { useAuthStore } from "../store/authStore";
import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user } = useAuthStore();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: menu + search - allow this region to shrink so right-side icons are never cropped */}
        <div className="flex items-center flex-1 min-w-0">
          <button 
            onClick={toggleSidebar}
            className="mr-3 text-gray-500 hover:text-gray-700 lg:hidden flex-shrink-0"
          >
            <Menu size={24} />
          </button>
          <div className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              size={18} 
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full min-w-0 pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          <button className="p-2 text-gray-500 hover:text-gray-700 relative">
            <Bell size={22} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
