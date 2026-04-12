import React from 'react';
import { Activity, ClipboardList, Settings, LogOut, Menu } from 'lucide-react';

const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const navItems = [
    { icon: <Activity className="w-5 h-5" />, label: 'Dashboard', active: true },
    { icon: <ClipboardList className="w-5 h-5" />, label: 'History', active: false },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', active: false },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Activity className="w-6 h-6 text-blue-600 mr-2" />
            <span className="text-lg font-bold text-slate-800">ParkinsonMPR</span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center px-4 py-3 rounded-lg transition-colors group ${
                  item.active 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`${item.active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} mr-3`}>
                  {item.icon}
                </div>
                {item.label}
              </a>
            ))}
          </div>

          {/* User / Logout */}
          <div className="p-4 border-t border-slate-100">
            <button className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-red-600 rounded-lg transition-colors group">
              <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-red-500" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
