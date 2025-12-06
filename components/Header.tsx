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

  const NavButton = ({ mode, icon: Icon, label }: { mode: AppMode, icon: any, label: string }) => (
    <button
        onClick={() => setMode(mode)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentMode === mode
            ? 'bg-dragon-50 dark:bg-dragon-900/30 text-dragon-800 dark:text-dragon-200 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-dragon-700 dark:hover:text-dragon-300 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
    >
        <Icon className={`w-4 h-4 ${currentMode === mode ? 'text-dragon-600 dark:text-dragon-400' : ''}`} />
        <span className="hidden lg:inline">{label}</span>
    </button>
  );

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Area */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setMode(AppMode.UPLOAD)}>
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-dragon-600 to-dragon-800 rounded-lg shadow-md shadow-dragon-900/10">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight hidden sm:block">DigiMedPro</h1>
              <span className="text-[10px] font-semibold text-dragon-600 dark:text-dragon-400 uppercase tracking-widest hidden sm:block">Transcribe</span>
            </div>
          </div>

          {/* Navigation/Mode Switcher */}
          <nav className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
            {hasPermission('CAN_UPLOAD_AUDIO') && <NavButton mode={AppMode.UPLOAD} icon={FileAudio} label="Files" />}
            {hasPermission('CAN_USE_LIVE_DICTATION') && <NavButton mode={AppMode.LIVE} icon={Mic2} label="Dictation" />}
            {hasPermission('CAN_EXTRACT_INVOICES') && <NavButton mode={AppMode.INVOICE_EXTRACTOR} icon={FileSpreadsheet} label="Invoices" />}
            
            {hasPermission('CAN_VIEW_REPORTS') && (
               <>
                 <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                 <NavButton mode={AppMode.REPORTS} icon={BarChart2} label="Reports" />
               </>
            )}

            {currentUser.role === UserRole.SUPERADMIN && (
              <>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <NavButton mode={AppMode.USERS} icon={Users} label="Users" />
                <NavButton mode={AppMode.MASTER_DASHBOARD} icon={LayoutDashboard} label="Admin" />
              </>
            )}
          </nav>

          {/* Right Area: Theme Toggle & User Profile */}
          <div className="flex items-center gap-3 pl-4">
             {/* Theme Toggle */}
             <button 
               onClick={toggleTheme}
               className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
               title="Toggle Dark Mode"
             >
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             <div className="flex flex-col items-end hidden md:flex">
                 <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">{currentUser.fullName}</span>
                 <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mt-1 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{currentUser.role}</span>
             </div>
             
             <div className="relative group">
                 {currentUser.avatarUrl ? (
                    <img 
                      src={currentUser.avatarUrl} 
                      alt="Profile" 
                      className="w-9 h-9 rounded-full border-2 border-slate-100 dark:border-slate-800 cursor-pointer object-cover shadow-sm"
                    />
                 ) : (
                    <button className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                        <UserIcon className="w-5 h-5" />
                    </button>
                 )}
                 
                 <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800 py-1 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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