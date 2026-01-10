import React, { useState } from "react";
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTestManagerStore } from '../store/testManagerStore';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Calendar,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Folder,
  List,
  Layers,
  ClipboardList,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  subItems: SubMenuItem[];
  requiresProject?: boolean;
}

interface SubMenuItem {
  label: string;
  to: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const { logout } = useAuthStore();
  const { activeProject, projects, setActiveSuite, setActiveSuiteId } = useTestManagerStore();
  const navigate = useNavigate();
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const currentProject = projects.find(p => p.id === activeProject);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubMenu = (menu: string): void => {
    setActiveSubMenu(activeSubMenu === menu ? null : menu);
  };

  // Handle clicking on "All Cases" - clear suite selection to show all cases
  const handleAllCasesClick = () => {
    setActiveSuite(null);
    setActiveSuiteId(null);
  };

  const menuItems: MenuItem[] = [
    {
      icon: <LayoutDashboard size={18} />,
      label: 'Dashboard',
      to: '/dashboard',
      subItems: []
    },
    {
      icon: <Folder size={18} />,
      label: 'Projects',
      to: '/test-manager/projects',
      subItems: []
    },
    {
      icon: <Layers size={18} />,
      label: 'Test Suites',
      to: '/test-manager/suites',
      subItems: [],
      requiresProject: true
    },
    {
      icon: <List size={18} />,
      label: 'All Cases',
      to: '/test-manager/cases',
      subItems: [],
      requiresProject: true
    },
    {
      icon: <ClipboardList size={18} />,
      label: 'Plans',
      to: '/test-manager/plans',
      subItems: [],
      requiresProject: true
    },
    {
      icon: <Calendar size={18} />,
      label: 'Calendar',
      to: '/calendar',
      subItems: []
    },
    {
      icon: <PieChart size={18} />,
      label: 'Analytics',
      to: '/analytics',
      subItems: []
    },
  ];

  return (
    <div className={`glass-sidebar h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200/50 dark:border-gray-700/50">
        {!isCollapsed && <h1 className="text-sm font-semibold text-gray-900 tracking-tight dark:text-gray-100">Test Case Manager</h1>}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-black/5 text-gray-500 transition-colors dark:text-gray-400 dark:hover:bg-white/10"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Active Project Indicator */}
        {!isCollapsed && activeProject && currentProject && (
          <div className="mb-4">
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 shadow-sm dark:bg-gray-800/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-md ${currentProject.color || 'bg-system-blue'} flex items-center justify-center shadow-sm`}>
                  <Folder size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold dark:text-gray-400">Active Project</p>
                  <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">{currentProject.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.subItems.length > 0 ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(item.label)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${activeSubMenu === item.label
                        ? 'bg-black/5 text-gray-900 font-medium dark:bg-white/10 dark:text-gray-100'
                        : 'text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100'
                      }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left text-sm">{item.label}</span>
                        {activeSubMenu === item.label ? (
                          <ChevronRight className="transform rotate-90 text-gray-400" size={14} />
                        ) : (
                          <ChevronRight className="text-gray-400" size={14} />
                        )}
                      </>
                    )}
                  </button>
                  {!isCollapsed && activeSubMenu === item.label && (
                    <ul className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2 dark:border-gray-700">
                      {item.subItems.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <NavLink
                            to={subItem.to}
                            className={({ isActive }) =>
                              `block px-3 py-1.5 text-sm rounded-md transition-colors ${isActive
                                  ? 'text-gray-900 bg-black/5 font-medium dark:text-gray-100 dark:bg-white/10'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/10'
                                }`}
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
                  onClick={item.to === '/test-manager/cases' ? handleAllCasesClick : undefined}
                  className={({ isActive }) => {
                    const isDisabled = item.requiresProject && !activeProject;

                    return `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                        ? 'bg-system-blue text-white shadow-sm font-medium dark:bg-system-darkBlue'
                        : isDisabled
                          ? 'text-gray-400 hover:bg-black/5 hover:text-gray-500 opacity-60 cursor-not-allowed dark:text-gray-500 dark:hover:bg-white/5'
                          : 'text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100'
                      }`;
                  }}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <div className="flex-1">
                      <span className="text-sm">{item.label}</span>
                      {item.requiresProject && !activeProject && (
                        <span className="block text-[10px] text-gray-400 mt-0.5 dark:text-gray-500">Select project first</span>
                      )}
                    </div>
                  )}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile & Settings */}
      <div className="p-3 border-t border-gray-200/50 bg-white/30 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/30">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive
                ? 'bg-black/5 text-gray-900 dark:bg-white/10 dark:text-gray-100'
                : 'text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100'
              }`}
        >
          <Settings size={18} />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 text-system-red rounded-lg hover:bg-red-50 transition-colors mt-1 dark:hover:bg-red-900/20"
        >
          <LogOut size={18} />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
