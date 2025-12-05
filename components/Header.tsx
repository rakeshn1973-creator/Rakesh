import React from 'react';
import { Mic2, FileAudio, Stethoscope } from 'lucide-react';
import { AppMode } from '../types';

interface HeaderProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ currentMode, setMode }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-dragon-600 rounded-lg shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Dragon Transcribe</h1>
            </div>
          </div>

          {/* Navigation/Mode Switcher */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => setMode(AppMode.UPLOAD)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentMode === AppMode.UPLOAD
                  ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileAudio className="w-4 h-4" />
              Files
            </button>
            <button
              onClick={() => setMode(AppMode.LIVE)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentMode === AppMode.LIVE
                  ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Mic2 className="w-4 h-4" />
              Dictation
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;