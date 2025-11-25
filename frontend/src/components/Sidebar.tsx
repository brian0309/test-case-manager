import React from "react";
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  subItems: SubMenuItem[];
}

interface SubMenuItem {
  label: string;
  to: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubMenu = (menu: string): void => {
    setActiveSubMenu(activeSubMenu === menu ? null : menu);
  };

  const menuItems: MenuItem[] = [
    { 
      icon: <LayoutDashboard size={20} />, 
      label: 'Dashboard', 
      to: '/dashboard',
      subItems: []
    },
    { 
      icon: <Users size={20} />, 
      label: 'Users', 
      to: '#',
      subItems: [
        { label: 'All Users', to: '/users' },
        { label: 'Add New', to: '/users/new' },
        { label: 'Roles', to: '/users/roles' },
      ]
    },
    { 
      icon: <FileText size={20} />, 
      label: 'Posts', 
      to: '/posts',
      subItems: []
    },
    { 
      icon: <MessageSquare size={20} />, 
      label: 'Messages', 
      to: '/messages',
      subItems: []
    },
    { 
      icon: <Calendar size={20} />, 
      label: 'Calendar', 
      to: '/calendar',
      subItems: []
    },
    { 
      icon: <PieChart size={20} />, 
      label: 'Analytics', 
      to: '/analytics',
      subItems: []
    },
    { 
      icon: <Lightbulb size={20} />, 
      label: 'Example', 
      to: '/example',
      subItems: []
    },
  ];

  return (
    <div className={`bg-white h-screen flex flex-col border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && <h1 className="text-xl font-bold text-blue-600">Admin Panel</h1>}
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.subItems.length > 0 ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(item.label)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSubMenu === item.label ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {activeSubMenu === item.label ? (
                          <ChevronRight className="transform rotate-90" size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </>
                    )}
                  </button>
                  {!isCollapsed && activeSubMenu === item.label && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <NavLink
                            to={subItem.to}
                            className={({ isActive }) =>
                              `block px-4 py-2 text-sm rounded-lg transition-colors ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`
                            }
                          >
                            {subItem.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`
                  }
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile & Settings */}
      <div className="p-4 border-t border-gray-200">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`
          }
        >
          <Settings size={20} />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
