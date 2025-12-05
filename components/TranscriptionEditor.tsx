import React, { useEffect, useRef } from 'react';
import { Copy, Save, Check, Wand2, Download, FileText } from 'lucide-react';
import { formatDictationText } from '../utils/textFormatting';
import { downloadDoc, downloadText } from '../utils/exportUtils';

interface TranscriptionEditorProps {
  text: string;
  fileName?: string;
  onChange: (text: string) => void;
}

const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({ text, fileName, onChange }) => {
  const [copied, setCopied] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualFormat = () => {
    if (!text) return;
    const formatted = formatDictationText(text);
    onChange(formatted);
  };

  const handleExportDoc = () => {
    if (!text) {
      alert("No content to export. Please transcribe a file or start dictation first.");
      return;
    }
    downloadDoc(fileName || "Transcription", text);
  };

  const handleExportTxt = () => {
    if (!text) {
      alert("No content to export. Please transcribe a file or start dictation first.");
      return;
    }
    downloadText(fileName || "Transcription", text);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl flex-shrink-0">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-2 h-6 bg-dragon-500 rounded-full"></span>
          Transcribed Report
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handleManualFormat}
            disabled={!text}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
              !text 
                ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                : 'text-dragon-700 bg-dragon-50 border-dragon-200 hover:bg-dragon-100'
            }`}
            title="Apply formatting rules and clean filler words"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Format
          </button>
          
          <div className="h-6 w-px bg-slate-300 mx-1 self-center"></div>

          <button 
            onClick={handleExportTxt}
            disabled={!text}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
              !text
                ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
            }`}
            title="Download as Text File"
          >
            <FileText className="w-3.5 h-3.5" />
            TXT
          </button>

          <button 
            onClick={handleExportDoc}
            disabled={!text}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
              !text
                ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
            }`}
            title="Download as Word Doc"
          >
            <Download className="w-3.5 h-3.5" />
            Word
          </button>

          <button 
            onClick={handleCopy}
            disabled={!text}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
              !text
                ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="p-0 flex-grow relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Transcription will appear here..."
          className="w-full h-full p-6 resize-none focus:outline-none focus:ring-2 focus:ring-dragon-500/20 text-slate-800 leading-relaxed font-mono text-sm custom-scrollbar bg-white"
          spellCheck={false}
        />
        {text.length === 0 && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <span className="text-4xl font-bold text-slate-300">No Content</span>
           </div>
        )}
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between rounded-b-xl flex-shrink-0">
         <span>Word count: {text.split(/\s+/).filter(w => w.length > 0).length}</span>
         <span>Dragon Compatibility Mode: Active</span>
      </div>
    </div>
  );
};

export default TranscriptionEditor;