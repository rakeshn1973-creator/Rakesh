import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FileUploadView from './components/FileUploadView';
import LiveDictationView from './components/LiveDictationView';
import LoginOverlay from './components/LoginOverlay';
import ReportingView from './components/ReportingView';
import UserManagementView from './components/UserManagementView';
import InvoiceExtractorView from './components/InvoiceExtractorView';
import MasterDashboard from './components/MasterDashboard';
import { AppMode, BatchFile, FileStatus, User, InvoiceData } from './types';
import { transcribeAudioFile } from './services/geminiService';
import { convertFile, needsConversion } from './services/conversionService';
import { saveJobRecord, loginUser, getLearningContext } from './services/storageService';
import { getAudioDuration } from './utils/audioUtils';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const MAX_CONCURRENT_UPLOADS = 3;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Batch State
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isQueueActive, setIsQueueActive] = useState(false);

  // Invoices State (Shared)
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);

  // Live Dictation State
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  // Handle Theme Toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Re-fetch user on mount to ensure template data is up to date if they re-login or refresh
  const handleLogin = (user: User) => {
      const freshUser = loginUser(user.username); 
      setCurrentUser(freshUser || user);
  };
  
  const handleUpdateUser = (updatedUser: User) => {
      setCurrentUser(updatedUser);
  };

  const handleFilesAdded = async (newFiles: File[]) => {
    // Optimistic UI update first with 0 duration
    const tempIds: string[] = [];
    const newBatchFiles: BatchFile[] = [];

    // Process one by one to get duration, but trigger UI updates
    for (const file of newFiles) {
        const id = generateId();
        tempIds.push(id);
        
        // We push to state immediately to show in UI, duration updates later
        const newFileObj: BatchFile = {
            id: id,
            originalFile: file,
            fileName: file.name,
            fileSize: file.size,
            durationSeconds: 0, // Placeholder
            status: FileStatus.QUEUED,
            progress: 0,
            transcript: '',
            createdAt: Date.now()
        };
        newBatchFiles.push(newFileObj);
    }

    setFiles(prev => [...prev, ...newBatchFiles]);
    setIsQueueActive(true);

    // Fetch durations in background
    newBatchFiles.forEach(async (bf) => {
        try {
            const duration = await getAudioDuration(bf.originalFile);
            setFiles(prev => prev.map(f => f.id === bf.id ? { ...f, durationSeconds: duration } : f));
        } catch (e) {
            console.warn("Could not get duration for", bf.fileName);
        }
    });
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFileId === id) {
      setSelectedFileId(null);
    }
  };

  const handleUpdateLiveTranscript = (text: string) => {
    setLiveTranscript(prev => prev + " " + text);
  };

  const processFile = useCallback(async (fileId: string, file: BatchFile) => {
    // 1. Conversion Phase
    if (needsConversion(file.fileName)) {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.CONVERTING, progress: 0 } : f));
      
      try {
        await convertFile(file, (progress) => {
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress } : f));
        });
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.READY_TO_TRANSCRIBE, progress: 0 } : f));
      } catch (error) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.ERROR, error: "Conversion Failed" } : f));
        return; 
      }
    }

    // 2. Transcription Phase
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.TRANSCRIBING, progress: 0 } : f));

    // Simulation of progress while waiting for API
    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId && f.status === FileStatus.TRANSCRIBING) {
           // Cap at 90% until real response comes back
           const newProgress = Math.min(f.progress + Math.floor(Math.random() * 3) + 1, 90);
           return { ...f, progress: newProgress };
        }
        return f;
      }));
    }, 800);

    try {
      // Fetch learned context to inject into prompt
      const learningContext = getLearningContext();
      
      const transcript = await transcribeAudioFile(file.originalFile, learningContext);
      
      clearInterval(progressInterval);
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: FileStatus.COMPLETED, transcript: transcript, progress: 100 } : f
      ));

      if (currentUser) {
          saveJobRecord(
              currentUser,
              file.fileName,
              transcript,
              file.durationSeconds || 0
          );
      }

    } catch (error: any) {
      clearInterval(progressInterval);
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: FileStatus.ERROR, error: error.message } : f
      ));
    }
  }, [currentUser]);

  // Queue Monitor
  useEffect(() => {
    if (!isQueueActive) return;

    const activeJobs = files.filter(f => 
      f.status === FileStatus.CONVERTING || 
      f.status === FileStatus.TRANSCRIBING
    ).length;

    const queuedJobs = files.filter(f => f.status === FileStatus.QUEUED);

    if (activeJobs < MAX_CONCURRENT_UPLOADS && queuedJobs.length > 0) {
      const nextFile = queuedJobs[0];
      processFile(nextFile.id, nextFile);
    }
  }, [files, isQueueActive, processFile]);

  const startBatchProcessing = () => {
    setIsQueueActive(true);
  };

  if (!currentUser) {
      return <LoginOverlay onLogin={handleLogin} />;
  }

  const renderContent = () => {
      switch(currentMode) {
          case AppMode.UPLOAD:
              return (
                <FileUploadView 
                    files={files}
                    onFilesAdded={handleFilesAdded}
                    onRemoveFile={handleRemoveFile}
                    onSelectFile={setSelectedFileId}
                    selectedFileId={selectedFileId}
                    onProcessBatch={startBatchProcessing}
                    isProcessing={isQueueActive}
                    invoices={invoices}
                    currentUser={currentUser}
                />
              );
          case AppMode.LIVE:
              return (
                <LiveDictationView 
                    transcript={liveTranscript}
                    onTranscriptUpdate={handleUpdateLiveTranscript} 
                />
              );
          case AppMode.REPORTS:
              return <ReportingView />;
          case AppMode.USERS:
              return <UserManagementView currentUser={currentUser} onUserUpdate={handleUpdateUser} />;
          case AppMode.INVOICE_EXTRACTOR:
              return (
                <InvoiceExtractorView 
                    invoices={invoices} 
                    setInvoices={setInvoices} 
                />
              );
          case AppMode.MASTER_DASHBOARD:
              return <MasterDashboard />;
          default:
              return <div>View not found</div>;
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Header 
        currentMode={currentMode} 
        setMode={setMode} 
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;