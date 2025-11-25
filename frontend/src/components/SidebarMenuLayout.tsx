import React from 'react';

interface SidebarMenuLayoutProps {
  children: React.ReactNode;
}

const SidebarMenuLayout: React.FC<SidebarMenuLayoutProps> = ({ children }) => {
    return (
        <aside className="w-64 min-h-screen bg-slate-800 text-white p-4 fixed">
            <div className="flex flex-col">
                {children}
            </div>
        </aside>
    )
};

export default SidebarMenuLayout;