
import React from 'react';
import { Mic2, FileAudio, Stethoscope, BarChart2, Users, LogOut, User as UserIcon, Moon, Sun, FileSpreadsheet, LayoutDashboard } from 'lucide-react';
import { AppMode, User, UserRole } from '../types';

interface HeaderProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  currentUser: User;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentMode, setMode, currentUser, onLogout, isDarkMode, toggleTheme }) => {
  const hasPermission = (perm: string) => currentUser.permissions?.includes(perm as any);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Area */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode(AppMode.UPLOAD)}>
            <div className="flex items-center justify-center w-8 h-8 bg-dragon-700 rounded-lg shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight hidden sm:block">DigiMedPro - Transcribe</h1>
            </div>
          </div>

          {/* Navigation/Mode Switcher */}
          <nav className="flex items-center gap-1 sm:gap-2">
            
            {hasPermission('CAN_UPLOAD_AUDIO') && (
                <button
                onClick={() => setMode(AppMode.UPLOAD)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentMode === AppMode.UPLOAD
                    ? 'bg-dragon-50 dark:bg-dragon-900/30 text-dragon-900 dark:text-dragon-100 ring-1 ring-dragon-200 dark:ring-dragon-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-dragon-700 dark:hover:text-dragon-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                >
                <FileAudio className="w-4 h-4" />
                <span className="hidden sm:inline">Files</span>
                </button>
            )}

            {hasPermission('CAN_USE_LIVE_DICTATION') && (
                <button
                onClick={() => setMode(AppMode.LIVE)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentMode === AppMode.LIVE
                    ? 'bg-dragon-50 dark:bg-dragon-900/30 text-dragon-900 dark:text-dragon-100 ring-1 ring-dragon-200 dark:ring-dragon-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-dragon-700 dark:hover:text-dragon-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                >
                <Mic2 className="w-4 h-4" />
                <span className="hidden sm:inline">Dictation</span>
                </button>
            )}
            
            {hasPermission('CAN_EXTRACT_INVOICES') && (
                <button
                onClick={() => setMode(AppMode.INVOICE_EXTRACTOR)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentMode === AppMode.INVOICE_EXTRACTOR
                    ? 'bg-dragon-50 dark:bg-dragon-900/30 text-dragon-900 dark:text-dragon-100 ring-1 ring-dragon-200 dark:ring-dragon-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-dragon-700 dark:hover:text-dragon-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Invoices</span>
                </button>
            )}

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            
            {hasPermission('CAN_VIEW_REPORTS') && (
                <button
                onClick={() => setMode(AppMode.REPORTS)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentMode === AppMode.REPORTS
                    ? 'bg-dragon-50 dark:bg-dragon-900/30 text-dragon-900 dark:text-dragon-100 ring-1 ring-dragon-200 dark:ring-dragon-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-dragon-700 dark:hover:text-dragon-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                >
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">Reports</span>
                </button>
            )}

            {currentUser.role === UserRole.SUPERADMIN && (
              <>
                 <button
                    onClick={() => setMode(AppMode.USERS)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentMode === AppMode.USERS
                        ? 'bg-dragon-50 dark:bg-dragon-900/30 text-dragon-900 dark:text-dragon-100 ring-1 ring-dragon-200 dark:ring-dragon-800'
                        : 'text-slate-500 dark:text-slate-400 hover:text-dragon-700 dark:hover:text-dragon-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Users</span>
                </button>
                <button
                    onClick={() => setMode(AppMode.MASTER_DASHBOARD)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentMode === AppMode.MASTER_DASHBOARD
                        ? 'bg-dragon-50 dark:bg-dragon-900/30 text-dragon-900 dark:text-dragon-100 ring-1 ring-dragon-200 dark:ring-dragon-800'
                        : 'text-slate-500 dark:text-slate-400 hover:text-dragon-700 dark:hover:text-dragon-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Area: Theme Toggle & User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
             
             {/* Theme Toggle */}
             <button 
               onClick={toggleTheme}
               className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
               title="Toggle Dark Mode"
             >
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             <div className="flex flex-col items-end hidden md:flex">
                 <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{currentUser.fullName}</span>
                 <span className="text-xs text-slate-500 dark:text-slate-400 uppercase">{currentUser.role}</span>
             </div>
             <div className="relative group">
                 {currentUser.avatarUrl ? (
                    <img 
                      src={currentUser.avatarUrl} 
                      alt="Profile" 
                      className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer object-cover"
                    />
                 ) : (
                    <button className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <UserIcon className="w-5 h-5" />
                    </button>
                 )}
                 
                 <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 py-1 hidden group-hover:block">
                     <button 
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                     >
                         <LogOut className="w-4 h-4" /> Sign Out
                     </button>
                 </div>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
