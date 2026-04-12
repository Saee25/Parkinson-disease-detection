import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = ({ children }) => {
  const [isMobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isMobileOpen={isMobileOpen} setMobileOpen={setMobileOpen} />
      
      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white h-16 border-b border-slate-200 flex items-center px-4 justify-between sticky top-0 z-10">
          <span className="text-lg font-bold text-slate-800">ParkinsonMPR</span>
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
