import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FileUploadView from './components/FileUploadView';
import LiveDictationView from './components/LiveDictationView';
import { AppMode, BatchFile, FileStatus } from './types';
import { transcribeAudioFile } from './services/geminiService';
import { convertFile, needsConversion } from './services/conversionService';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const MAX_CONCURRENT_UPLOADS = 3;

const App: React.FC = () => {
  const [currentMode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  
  // Batch State
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isQueueActive, setIsQueueActive] = useState(false);

  // Live Dictation State
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const handleFilesAdded = (newFiles: File[]) => {
    const batchFiles: BatchFile[] = newFiles.map(file => ({
      id: generateId(),
      originalFile: file,
      fileName: file.name,
      fileSize: file.size,
      status: FileStatus.QUEUED,
      progress: 0,
      transcript: '',
      createdAt: Date.now()
    }));

    setFiles(prev => [...prev, ...batchFiles]);
    // Automatically start queue if files are added
    setIsQueueActive(true);
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

  // ----------------------------------------------------------------------
  // Parallel Processing Logic
  // ----------------------------------------------------------------------

  // Process a single file from start to finish
  const processFile = useCallback(async (fileId: string, file: BatchFile) => {
    
    // 1. Conversion Step
    if (needsConversion(file.fileName)) {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.CONVERTING, progress: 0 } : f));
      
      try {
        await convertFile(file, (progress) => {
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress } : f));
        });
        
        // Update to ready state so it falls through to transcription logic if we were separating them,
        // but here we just continue straight to transcription in the same "job"
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.READY_TO_TRANSCRIBE, progress: 0 } : f));
        
      } catch (error) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.ERROR, error: "Conversion Failed" } : f));
        return; // Stop processing this file
      }
    }

    // 2. Transcription Step
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: FileStatus.TRANSCRIBING, progress: 0 } : f));

    // Simulate progress for visual feedback while waiting for API
    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId && f.status === FileStatus.TRANSCRIBING) {
           const newProgress = Math.min(f.progress + Math.floor(Math.random() * 3) + 1, 90);
           return { ...f, progress: newProgress };
        }
        return f;
      }));
    }, 800);

    try {
      const transcript = await transcribeAudioFile(file.originalFile);
      
      clearInterval(progressInterval);
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: FileStatus.COMPLETED, transcript: transcript, progress: 100 } : f
      ));

    } catch (error: any) {
      clearInterval(progressInterval);
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: FileStatus.ERROR, error: error.message } : f
      ));
    }
  }, []);

  // Queue Monitor: Watches file list and starts jobs if slots are available
  useEffect(() => {
    if (!isQueueActive) return;

    const activeJobs = files.filter(f => 
      f.status === FileStatus.CONVERTING || 
      f.status === FileStatus.TRANSCRIBING
    ).length;

    if (activeJobs < MAX_CONCURRENT_UPLOADS) {
      // Find next queued file
      const nextFile = files.find(f => f.status === FileStatus.QUEUED);
      
      if (nextFile) {
        // Immediately mark as processing (or converting) to prevent double-pickup by next effect cycle
        // We actually start processing, which sets the status inside processFile.
        // However, we need to ensure processFile is called once.
        processFile(nextFile.id, nextFile);
      } else {
        // No more files queued. 
        // We keep isQueueActive true in case user adds more files, 
        // or we could turn it off if we wanted explicit start button only.
        // For "TurboScribe" feel, auto-processing is usually better.
      }
    }
  }, [files, isQueueActive, processFile]);

  const startBatchProcessing = () => {
    setIsQueueActive(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] font-sans text-slate-900">
      <Header currentMode={currentMode} setMode={setMode} />

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        
        {/* Unified Main View */}
        {currentMode === AppMode.UPLOAD ? (
           <FileUploadView 
              files={files}
              onFilesAdded={handleFilesAdded}
              onRemoveFile={handleRemoveFile}
              onSelectFile={setSelectedFileId}
              selectedFileId={selectedFileId}
              onProcessBatch={startBatchProcessing}
              isProcessing={isQueueActive}
           />
        ) : (
           <LiveDictationView 
             transcript={liveTranscript}
             onTranscriptUpdate={handleUpdateLiveTranscript} 
           />
        )}

      </main>
    </div>
  );
};

export default App;