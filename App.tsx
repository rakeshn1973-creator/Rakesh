
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FileUploadView from './components/FileUploadView';
import LiveDictationView from './components/LiveDictationView';
import LoginOverlay from './components/LoginOverlay';
import ReportingView from './components/ReportingView';
import UserManagementView from './components/UserManagementView';
import InvoiceExtractorView from './components/InvoiceExtractorView';
import MasterDashboard from './components/MasterDashboard';
import { AppMode, BatchFile, FileStatus, User, InvoiceData, UserRole } from './types';
import { transcribeAudioFile, extractInvoiceData } from './services/geminiService';
import { convertFile, needsConversion } from './services/conversionService';
import { saveJobRecord, loginUser, getLearningContext, saveUserTemplate, getUsers } from './services/storageService';
import { getAudioDuration, fileToBase64 } from './utils/audioUtils';
import { generateWordFromTemplate } from './utils/exportUtils';
import { v4 as uuidv4 } from 'uuid';

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
      // If the updated user is the current user, update state
      if (currentUser && updatedUser.id === currentUser.id) {
          setCurrentUser(updatedUser);
      }
  };

  const handleFilesAdded = async (newFiles: File[], targetDoctorId?: string) => {
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
            createdAt: Date.now(),
            ownerId: targetDoctorId // If set (by Admin), this tracks who the file belongs to
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
              file.durationSeconds || 0,
              file.ownerId // Pass the explicit owner ID if it exists (for Admin uploads)
          );
      }

      // Auto-Export Logic
      // Attempt to find a matching invoice or just use the first available one if user only has one patient
      // This is a "Best Effort" automation for the "Dragon" workflow
      // Only runs if we have a template and data
      
      const targetUserId = file.ownerId || currentUser?.id;
      const allUsers = getUsers();
      const ownerUser = allUsers.find(u => u.id === targetUserId);
      
      if (ownerUser && ownerUser.templateBase64 && invoices.length > 0) {
           // Basic logic: If there is exactly 1 completed invoice, assume it matches this audio
           // Or if filenames are similar (advanced logic omitted for now)
           const validInvoice = invoices.find(i => i.status === 'COMPLETED' && i.data);
           
           if (validInvoice && validInvoice.data) {
               console.log("Auto-generating Word document...");
               const success = generateWordFromTemplate(
                   ownerUser.templateBase64,
                   transcript,
                   validInvoice.data
               );
               if (success) {
                  // Maybe mark file as "Exported"?
               }
           }
      }

    } catch (error: any) {
      clearInterval(progressInterval);
      
      let errorMsg = error.message;
      if (errorMsg.includes("401") || errorMsg.includes("UNAUTHENTICATED")) {
          errorMsg = "API Key Invalid/Missing";
      }

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: FileStatus.ERROR, error: errorMsg } : f
      ));
    }
  }, [currentUser, invoices]); // Added invoices dependency for auto-export

  // Unified Handler for Invoice Images
  const handleProcessInvoices = async (files: File[]) => {
    const newInvoices: InvoiceData[] = files.map(f => ({
      id: uuidv4(),
      fileName: f.name,
      status: 'PROCESSING'
    }));

    setInvoices(prev => [...prev, ...newInvoices]);
    
    // We DO NOT auto-switch anymore so user can see audio progress if mixed upload
    // But we should notify them that images are processing in background
    if (currentMode === AppMode.UPLOAD) {
        // Subtle notification or just rely on the "View Extractor (N)" button updating
    } else {
        // If we are in another view, maybe we do want to switch? 
        // For now, let's keep it consistent: stay where you are.
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const invId = newInvoices[i].id;

        try {
            const data = await extractInvoiceData(file);
            
            setInvoices(prev => {
                const currentList = [...prev];
                const index = currentList.findIndex(item => item.id === invId);
                const slNo = index + 1; 

                if (data) {
                    data["Sl No"] = slNo.toString();
                }

                return currentList.map(item => 
                    item.id === invId 
                    ? { ...item, status: 'COMPLETED', data: data } 
                    : item
                );
            });

        } catch (err: any) {
            setInvoices(prev => prev.map(item => 
                item.id === invId 
                ? { ...item, status: 'ERROR', error: err.message } 
                : item
            ));
        }
    }
  };

  // Unified Handler for Template Uploads
  const handleUploadTemplate = async (file: File) => {
    if (!currentUser) return;
    
    try {
        const base64 = await fileToBase64(file);
        const updatedUser = saveUserTemplate(currentUser.id, base64);
        if (updatedUser) {
            setCurrentUser(updatedUser);
            alert("Template updated successfully!");
        }
    } catch (err) {
        alert("Failed to upload template.");
        console.error(err);
    }
  };

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
                    onImagesAdded={handleProcessInvoices}
                    onTemplateUploaded={handleUploadTemplate}
                    onRemoveFile={handleRemoveFile}
                    onSelectFile={setSelectedFileId}
                    selectedFileId={selectedFileId}
                    onProcessBatch={startBatchProcessing}
                    isProcessing={isQueueActive}
                    invoices={invoices}
                    currentUser={currentUser}
                    availableDoctors={getUsers().filter(u => u.role === UserRole.DOCTOR)} // Pass available doctors for Admin
                    onNavigate={setMode}
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
              return (
                <UserManagementView 
                    currentUser={currentUser} 
                    onUserUpdate={handleUpdateUser} 
                    onExit={() => setMode(AppMode.MASTER_DASHBOARD)}
                />
              );
          case AppMode.INVOICE_EXTRACTOR:
              return (
                <InvoiceExtractorView 
                    invoices={invoices} 
                    setInvoices={setInvoices}
                    onProcessInvoices={handleProcessInvoices}
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
