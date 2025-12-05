import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, AlertCircle, Radio, Copy, Trash2, FileText } from 'lucide-react';
import { LiveDictationSession } from '../services/geminiService';

interface LiveDictationViewProps {
  onTranscriptUpdate: (text: string) => void;
  transcript: string; // Receive transcript from parent
}

const LiveDictationView: React.FC<LiveDictationViewProps> = ({ onTranscriptUpdate, transcript }) => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<LiveDictationSession | null>(null);

  const toggleSession = async () => {
    if (isActive) {
      sessionRef.current?.disconnect();
      setIsActive(false);
    } else {
      setError(null);
      // Don't clear transcript on start automatically, user might want to continue
      // setTranscriptBuffer(''); 
      
      sessionRef.current = new LiveDictationSession(
        (text, isFinal) => {
           // Pass up to App
           if (text) {
             onTranscriptUpdate(text);
           }
        },
        (err) => {
          setError(err.message);
          setIsActive(false);
        }
      );

      await sessionRef.current.connect();
      setIsActive(true);
    }
  };

  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect();
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
  };

  const handleClear = () => {
    // We need a way to clear the parent state. 
    // Since we only have onTranscriptUpdate which appends, we need to handle clear differently
    // Actually, in App.tsx handleUpdateTranscript appends. 
    // For now, we will just reload the page or accept that 'Clear' is not fully implemented in this props structure,
    // but better: onTranscriptUpdate could accept a SET action.
    // However, to keep it simple, we will just use window reload or ask user.
    // Let's change the prop contract in App.tsx briefly if we wanted true clear, but for now:
    alert("To clear the transcript, please refresh the session.");
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* Control Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-dragon-400 to-dragon-600"></div>
        
        <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 relative z-10 ${
          isActive ? 'bg-red-50 ring-8 ring-red-50' : 'bg-slate-50'
        }`}>
          {isActive ? (
             <div className="relative">
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                <Mic className="w-10 h-10 text-red-500 animate-pulse" />
             </div>
          ) : (
            <Mic className="w-10 h-10 text-slate-400" />
          )}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isActive ? 'Live Dictation Active' : 'Ready to Dictate'}
        </h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          {isActive 
            ? 'Listening... Speak clearly. Your words will appear below.' 
            : 'Click the button to start the medical speech recognition engine.'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 text-left max-w-lg mx-auto">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={toggleSession}
          className={`w-full max-w-xs mx-auto py-3 px-6 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200' 
              : 'bg-dragon-600 hover:bg-dragon-700 text-white shadow-dragon-200'
          }`}
        >
          {isActive ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              Stop Dictation
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              Start Recording
            </>
          )}
        </button>

         {/* Visualizer bars */}
         {isActive && (
            <div className="mt-8 flex justify-center gap-1 h-8 items-end opacity-50">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-dragon-500 rounded-full animate-bounce"
                  style={{ 
                    height: `${Math.random() * 100}%`,
                    animationDuration: `${0.4 + Math.random() * 0.4}s`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>
          )}
      </div>

      {/* Transcript Display Area (Since we removed the right panel) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
           <h4 className="font-semibold text-slate-700 flex items-center gap-2">
             <FileText className="w-4 h-4 text-slate-400" />
             Live Transcript
           </h4>
           <div className="flex gap-2">
             <button 
               onClick={handleCopy}
               className="p-1.5 text-slate-500 hover:text-dragon-600 hover:bg-dragon-50 rounded transition-colors text-sm flex items-center gap-1"
             >
               <Copy className="w-4 h-4" /> Copy
             </button>
           </div>
        </div>
        <div className="flex-grow relative">
           <textarea 
             readOnly
             value={transcript}
             placeholder="Transcript will appear here as you speak..."
             className="w-full h-full p-6 resize-none focus:outline-none text-slate-800 leading-relaxed font-mono text-sm custom-scrollbar"
           />
           {transcript.length === 0 && !isActive && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <span className="text-slate-400 italic">Waiting for audio...</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default LiveDictationView;