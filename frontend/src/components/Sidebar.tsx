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
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      to: '/dashboard',
      subItems: []
    },
    {
      icon: <Folder size={20} />,
      label: 'Projects',
      to: '/test-manager/projects',
      subItems: []
    },
    {
      icon: <Layers size={20} />,
      label: 'Test Suites',
      to: '/test-manager/suites',
      subItems: [],
      requiresProject: true
    },
    {
      icon: <List size={20} />,
      label: 'All Cases',
      to: '/test-manager/cases',
      subItems: [],
      requiresProject: true
    },
    {
      icon: <ClipboardList size={20} />,
      label: 'Plans',
      to: '/test-manager/plans',
      subItems: [],
      requiresProject: true
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
  ];

  return (
    <div className={`glass-sidebar h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Test Case Manager</h1>}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-black/5 text-gray-500 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Active Project Indicator */}
        {!isCollapsed && activeProject && currentProject && (
          <div className="px-4 py-2 mb-2">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded ${currentProject.color || 'bg-blue-500'} flex items-center justify-center`}>
                  <Folder size={12} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 font-medium">Active Project</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentProject.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <ul className="space-y-0.5 px-3">
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.subItems.length > 0 ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(item.label)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${activeSubMenu === item.label ? 'bg-black/5 text-gray-900 font-medium' : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}`}
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
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                      {item.subItems.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <NavLink
                            to={subItem.to}
                            className={({ isActive }) =>
                              `block px-3 py-1.5 text-sm rounded-md transition-colors ${isActive ? 'text-gray-900 bg-black/5 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'}`
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
                  onClick={item.to === '/test-manager/cases' ? handleAllCasesClick : undefined}
                  className={({ isActive }) => {
                    // Check if this item requires a project
                    const isDisabled = item.requiresProject && !activeProject;

                    return `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                      ? 'bg-black/5 text-gray-900 font-medium shadow-sm ring-1 ring-black/5'
                      : isDisabled
                        ? 'text-gray-400 hover:bg-black/5 hover:text-gray-500 opacity-60'
                        : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'
                      }`;
                  }}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <div className="flex-1">
                      <span className="text-sm">{item.label}</span>
                      {item.requiresProject && !activeProject && (
                        <span className="block text-xs text-gray-400 mt-0.5">Select project first</span>
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
      <div className="p-3 border-t border-gray-200/50">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-black/5 text-gray-900' : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}`
          }
        >
          <Settings size={20} />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors mt-1"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
