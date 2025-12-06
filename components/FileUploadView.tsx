
import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileIcon, X, Loader2, CheckCircle2, FileText, Download, AlertCircle, PlayCircle, RefreshCw, Eye, Copy, Search, Trash2, ChevronDown, ChevronUp, FileOutput, Wand2, Save, FileSpreadsheet, History, Clock, User as UserIcon, Settings, Upload } from 'lucide-react';
import { BatchFile, FileStatus, InvoiceData, User, JobRecord, UserRole } from '../types';
import { exportBatch, downloadDoc, downloadText, generateWordFromTemplate, exportInvoiceToExcel } from '../utils/exportUtils';
import { formatTime, fileToBase64 } from '../utils/audioUtils';
import { getJobs, finalizeJob, saveUserTemplate, getUsers } from '../services/storageService';

interface FileUploadViewProps {
  files: BatchFile[];
  onFilesAdded: (files: File[], targetDoctorId?: string) => void;
  onImagesAdded?: (files: File[]) => void;
  onTemplateUploaded?: (file: File) => void;
  onRemoveFile: (id: string) => void;
  onSelectFile: (id: string) => void;
  selectedFileId: string | null;
  onProcessBatch: () => void;
  isProcessing: boolean;
  invoices?: InvoiceData[]; 
  currentUser?: User;
  availableDoctors?: User[]; // List of doctors for admin to select from
  onNavigate?: (mode: any) => void;
}

const FileUploadView: React.FC<FileUploadViewProps> = ({ 
  files, 
  onFilesAdded, 
  onImagesAdded,
  onTemplateUploaded,
  onRemoveFile, 
  onSelectFile,
  selectedFileId,
  onProcessBatch,
  isProcessing,
  invoices = [],
  currentUser,
  availableDoctors = [],
  onNavigate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // History State
  const [recentJobs, setRecentJobs] = useState<JobRecord[]>([]);
  
  // Template Export Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateFileId, setTemplateFileId] = useState<string | null>(null); // Can be a fileID or a JobID
  const [templateSourceType, setTemplateSourceType] = useState<'BATCH' | 'JOB'>('BATCH');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Editing State
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Admin Upload Configuration State ---
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);

  const canFinalize = currentUser?.permissions?.includes('CAN_FINALIZE_JOBS');
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;

  // Load history on mount or when a file completes
  useEffect(() => {
    if (currentUser) {
        const allJobs = getJobs();
        // If Admin, show all recent jobs? Or just their own? Let's show All for Admin, Own for User
        let userJobs;
        if (currentUser.role === UserRole.SUPERADMIN) {
             userJobs = allJobs;
        } else {
             userJobs = allJobs.filter(j => j.userId === currentUser.id);
        }
        
        userJobs = userJobs
            .sort((a, b) => b.uploadDate - a.uploadDate)
            .slice(0, 10); // Last 10 jobs
        setRecentJobs(userJobs);
    }
  }, [currentUser, files]);

  // Update selected doctor object when ID changes
  useEffect(() => {
      if (selectedDoctorId && availableDoctors) {
          const doc = availableDoctors.find(d => d.id === selectedDoctorId) || null;
          setSelectedDoctor(doc);
      } else {
          setSelectedDoctor(null);
      }
  }, [selectedDoctorId, availableDoctors]);


  const processMixedFiles = (fileList: File[]) => {
    const audioFiles: File[] = [];
    const imageFiles: File[] = [];
    const templateFiles: File[] = [];

    fileList.forEach(f => {
        if (f.name.endsWith('.docx')) {
            templateFiles.push(f);
        } else if (f.type.startsWith('image/')) {
            imageFiles.push(f);
        } else if (
            f.type.startsWith('audio/') || 
            f.name.endsWith('.dss') || 
            f.name.endsWith('.ds2') || 
            f.name.endsWith('.waptt') ||
            f.name.endsWith('.mp3') ||
            f.name.endsWith('.wav') ||
            f.name.endsWith('.m4a')
        ) {
            audioFiles.push(f);
        }
    });

    // 1. Handle Images (Invoices) - Global, no specific doctor assignment needed usually, or handled in Invoice view
    if (imageFiles.length > 0) {
        if (onImagesAdded) onImagesAdded(imageFiles);
    }

    // 2. Handle Templates - If Admin drops a template alone, maybe ask who it's for? 
    // For now, if template is dropped mixed with audio, we assume it's for the same doctor in the modal
    if (templateFiles.length > 0) {
        if (isSuperAdmin && audioFiles.length > 0) {
            // We will handle this template inside the config modal logic
            setNewTemplateFile(templateFiles[0]);
        } else if (onTemplateUploaded && !isSuperAdmin) {
            // Direct upload for self
            onTemplateUploaded(templateFiles[0]);
        } else if (isSuperAdmin && audioFiles.length === 0) {
             // Admin dropped just a template. 
             // Ideally we should open a "Update Doctor Template" modal. 
             // For simplicity, let's treat it as part of pending files to trigger the modal
             setNewTemplateFile(templateFiles[0]);
             setPendingUploadFiles([]); // No audio, just config
             setIsConfigModalOpen(true);
             return; 
        }
    }

    // 3. Handle Audio Files
    if (audioFiles.length > 0) {
        if (isSuperAdmin) {
            setPendingUploadFiles(audioFiles);
            setIsConfigModalOpen(true);
        } else {
            onFilesAdded(audioFiles);
        }
    }
  };

  const handleConfirmUploadConfiguration = async () => {
      if (!selectedDoctorId) {
          alert("Please select a doctor to assign these files to.");
          return;
      }

      // 1. If a new template was selected/dropped, save it to the doctor's profile
      if (newTemplateFile) {
          try {
              const base64 = await fileToBase64(newTemplateFile);
              saveUserTemplate(selectedDoctorId, base64);
              // Update local state to reflect change immediately if needed, 
              // but storageService handles persistence.
          } catch (e) {
              alert("Failed to save template for doctor.");
              return;
          }
      }

      // 2. Process audio files
      if (pendingUploadFiles.length > 0) {
          onFilesAdded(pendingUploadFiles, selectedDoctorId);
      }

      // Reset
      setIsConfigModalOpen(false);
      setPendingUploadFiles([]);
      setNewTemplateFile(null);
      setSelectedDoctorId('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processMixedFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processMixedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const togglePreview = (id: string, transcript: string) => {
    if (expandedFileId === id) {
        setExpandedFileId(null);
    } else {
        setEditBuffer(transcript);
        setExpandedFileId(id);
    }
  };

  const handleFinalizeJob = async (jobId: string) => {
      if (!canFinalize) {
          alert("You do not have permission to finalize jobs.");
          return;
      }
      setIsSaving(true);
      finalizeJob(jobId, editBuffer);
      
      // Refresh local list
      const allJobs = getJobs();
      let userJobs;
      if (currentUser?.role === UserRole.SUPERADMIN) {
           userJobs = allJobs;
      } else {
           userJobs = allJobs.filter(j => j.userId === currentUser?.id);
      }
      userJobs = userJobs.sort((a, b) => b.uploadDate - a.uploadDate).slice(0, 10);
      setRecentJobs(userJobs);
      
      alert("Job Finalized! The system has learned from your edits.");
      setIsSaving(false);
  };

  // Wrapper for batch file finalization (finds the job first)
  const handleFinalizeBatchFile = async (fileId: string) => {
      const file = files.find(f => f.id === fileId);
      if (!file || !currentUser) return;

      const jobs = getJobs();
      // Match by filename and owner
      // Note: If Admin uploaded it, file.ownerId should be the doctor. 
      // The Job should also be under the doctor.
      const targetUserId = file.ownerId || currentUser.id;
      
      const job = jobs.find(j => j.fileName === file.fileName && j.userId === targetUserId);
      
      if (job) {
          await handleFinalizeJob(job.id);
          // Update visual state in batch list
          file.transcript = editBuffer;
      } else {
          alert("Could not link this upload to a job record. Saved locally only.");
      }
  };

  const openTemplateModal = (id: string, type: 'BATCH' | 'JOB', e: React.MouseEvent) => {
      e.stopPropagation();
      setTemplateFileId(id);
      setTemplateSourceType(type);
      setIsTemplateModalOpen(true);
      setSelectedPatientId('');
  };

  const handleGenerateTemplate = () => {
      // 1. Fetch latest users state to ensure we have the most recent template
      // This fixes stale state if the user just uploaded a template via the Admin modal
      const latestUsers = getUsers();

      let transcriptToUse = "";
      let targetUserId = currentUser?.id;

      if (templateSourceType === 'BATCH') {
          const file = files.find(f => f.id === templateFileId);
          if (file) {
              transcriptToUse = (expandedFileId === file.id) ? editBuffer : file.transcript;
              targetUserId = file.ownerId || currentUser?.id;
          }
      } else {
          const job = recentJobs.find(j => j.id === templateFileId);
          if (job) {
              transcriptToUse = (expandedFileId === job.id) ? editBuffer : (job.finalTranscript || job.originalTranscript || "");
              targetUserId = job.userId;
          }
      }

      if (!transcriptToUse || transcriptToUse.trim().length === 0) {
          alert("Error: Transcript content is empty. Please ensure the file is transcribed.");
          return;
      }

      const patient = invoices.find(i => i.id === selectedPatientId);

      // Resolve Template using fresh user data
      // If we are logged in as this user, we can check currentUser (but fresh user list is safer)
      // If Admin exporting for Doctor, we MUST find that Doctor in the fresh list
      let templateBase64 = "";
      
      const ownerUser = latestUsers.find(u => u.id === targetUserId);
      if (ownerUser && ownerUser.templateBase64) {
          templateBase64 = ownerUser.templateBase64;
      } else if (currentUser && currentUser.templateBase64) {
          // Fallback to logged in user's template if owner has none
          templateBase64 = currentUser.templateBase64;
      }

      if (!patient || !templateBase64) {
          if (!patient) alert("Please select a patient.");
          else alert(`No Word template found for user (${ownerUser?.fullName}). Please upload one.`);
          return;
      }

      if (!patient.data) {
          alert("Selected patient has no extracted data.");
          return;
      }

      const success = generateWordFromTemplate(
          templateBase64,
          transcriptToUse,
          patient.data
      );

      if (success) {
          setIsTemplateModalOpen(false);
          setTemplateFileId(null);
      }
  };

  const filteredFiles = files.filter(f => f.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
  const completedCount = files.filter(f => f.status === FileStatus.COMPLETED).length;

  const StatusBadge = ({ status, progress }: { status: FileStatus, progress: number }) => {
    switch (status) {
      case FileStatus.CONVERTING:
        return (
          <div className="flex flex-col gap-1 w-full max-w-[140px]">
            <div className="flex justify-between items-center text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Converting...
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        );
      case FileStatus.TRANSCRIBING:
        return (
          <div className="flex flex-col gap-1 w-full max-w-[140px]">
             <div className="flex justify-between items-center text-xs font-medium text-blue-600 dark:text-blue-400">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Transcribing...
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        );
      case FileStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        );
      case FileStatus.ERROR:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      default: // QUEUED
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            <PlayCircle className="w-3 h-3" />
            Queued
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      
      {/* Upload Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative bg-white dark:bg-slate-900/50 rounded-xl border-2 border-dashed transition-all duration-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer group ${
          isDragOver 
            ? 'border-dragon-500 bg-dragon-50 dark:bg-dragon-900/20' 
            : 'border-slate-300 dark:border-slate-700 hover:border-dragon-400 dark:hover:border-dragon-500 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-4 bg-dragon-50 dark:bg-dragon-900/30 rounded-full mb-4 group-hover:scale-110 transition-transform duration-200">
          <UploadCloud className="w-8 h-8 text-dragon-700 dark:text-dragon-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Upload Files</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-4">
          Drag & drop files or click to browse.
          <br/>
          <span className="text-xs text-slate-400">
            Audio (.mp3, .wav, .dss) • Images (.jpg, .png) • Templates (.docx)
          </span>
        </p>
        <button className="px-5 py-2 bg-dragon-700 text-white text-sm font-semibold rounded-lg hover:bg-dragon-800 transition-colors shadow-sm shadow-dragon-900/20">
          Select Files
        </button>
        <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.dss,.ds2,.waptt,.jpg,.jpeg,.png,.webp,.docx"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
      </div>

      {/* ACTIVE QUEUE */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-dragon-600" />
                Active Queue
            </h2>
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-dragon-500/50 focus:border-transparent outline-none w-full sm:w-64 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
             <button
                 onClick={() => onNavigate && onNavigate('INVOICE_EXTRACTOR')}
                 className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
             >
                 <FileSpreadsheet className="w-4 h-4" />
                 <span className="hidden sm:inline">View Extractor ({invoices.length})</span>
             </button>
             
            {completedCount > 0 && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Download className="w-4 h-4" />
                  Export All
                </button>
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 hidden group-hover:block z-20">
                    <button onClick={() => exportBatch(files, 'doc')} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">As Word (.doc)</button>
                    <button onClick={() => exportBatch(files, 'txt')} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">As Text (.txt)</button>
                </div>
              </div>
            )}
            {files.some(f => f.status === FileStatus.QUEUED) && !isProcessing && (
                 <button 
                 onClick={onProcessBatch}
                 className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-dragon-600 rounded-lg hover:bg-dragon-700 transition-colors shadow-sm"
               >
                 <PlayCircle className="w-4 h-4" />
                 Start Processing
               </button>
            )}
          </div>
        </div>

        {/* Queue Table */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredFiles.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <p className="text-sm">No files in active queue.</p>
            </div>
          ) : (
            filteredFiles.map(file => (
              <div key={file.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900">
                <div 
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
                  onClick={() => togglePreview(file.id, file.transcript)}
                >
                  <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${file.status === FileStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-200 truncate">{file.fileName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block col-span-2 text-sm text-slate-600 dark:text-slate-400">
                     {file.durationSeconds ? formatTime(file.durationSeconds * 1000) : '--:--'}
                  </div>
                  <div className="col-span-6 sm:col-span-3 flex items-center">
                    <StatusBadge status={file.status} progress={file.progress} />
                  </div>
                  <div className="col-span-6 sm:col-span-2 flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {file.status === FileStatus.COMPLETED ? (
                      <>
                        <button 
                          onClick={(e) => openTemplateModal(file.id, 'BATCH', e)}
                          className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800 font-medium"
                          title="Generate from Template"
                        >
                          <FileOutput className="w-4 h-4" />
                          <span className="hidden lg:inline text-xs">Template</span>
                        </button>
                        <button 
                          onClick={() => downloadDoc(file.fileName, file.transcript)}
                          className="p-1.5 text-slate-400 hover:text-dragon-600 dark:hover:text-dragon-400 transition-colors"
                          title="Download Word (Standard)"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => togglePreview(file.id, file.transcript)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {expandedFileId === file.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </>
                    ) : (
                        <button 
                            onClick={() => onRemoveFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                </div>

                {expandedFileId === file.id && file.status === FileStatus.COMPLETED && (
                  <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-inner">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                             <FileText className="w-3 h-3" /> Edit & Finalize
                         </h4>
                         <div className="flex gap-2">
                            {canFinalize && (
                                <button 
                                    onClick={() => handleFinalizeBatchFile(file.id)}
                                    disabled={isSaving}
                                    className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                    Finalize & Learn
                                </button>
                            )}
                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 self-center"></div>
                             <button 
                                onClick={() => navigator.clipboard.writeText(editBuffer)}
                                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium flex items-center gap-1"
                            >
                                <Copy className="w-3 h-3" /> Copy
                            </button>
                         </div>
                      </div>
                      <textarea
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        className="w-full h-64 p-3 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-dragon-500 focus:outline-none font-mono resize-none custom-scrollbar"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RECENT HISTORY / PERSISTED JOBS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Recent History
            </h2>
            <span className="text-xs text-slate-500">Last 10 jobs</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentJobs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No history found.
                </div>
            ) : (
                recentJobs.map(job => (
                    <div key={job.id} className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div 
                            className="grid grid-cols-12 gap-4 px-6 py-3 items-center cursor-pointer"
                            onClick={() => togglePreview(job.id, job.finalTranscript || job.originalTranscript || "")}
                        >
                            <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                                <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate text-sm">{job.fileName}</p>
                                    <p className="text-[10px] text-slate-400">{job.jobNumber} • {job.userName}</p>
                                </div>
                            </div>
                            <div className="hidden sm:block col-span-2 text-xs text-slate-500">
                                {new Date(job.uploadDate).toLocaleDateString()}
                            </div>
                            <div className="col-span-6 sm:col-span-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    job.status === 'FINALIZED' 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                }`}>
                                    {job.status}
                                </span>
                            </div>
                            <div className="col-span-6 sm:col-span-2 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                <button 
                                    onClick={(e) => openTemplateModal(job.id, 'JOB', e)}
                                    className="p-1.5 text-slate-300 hover:text-purple-600 transition-colors"
                                    title="Export with Template"
                                >
                                    <FileOutput className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => downloadDoc(job.fileName, job.finalTranscript || job.originalTranscript || "")}
                                    className="p-1.5 text-slate-300 hover:text-dragon-600 transition-colors"
                                    title="Download Word"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                         {expandedFileId === job.id && (
                            <div className="px-6 pb-4 pt-0">
                                <div className="bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-slate-500">
                                            {job.status === 'FINALIZED' ? 'Final Transcript' : 'Draft Transcript'}
                                        </span>
                                        {job.status !== 'FINALIZED' && canFinalize && (
                                            <button 
                                                onClick={() => handleFinalizeJob(job.id)}
                                                disabled={isSaving}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Save as Final
                                            </button>
                                        )}
                                    </div>
                                    <textarea 
                                        value={editBuffer}
                                        onChange={e => setEditBuffer(e.target.value)}
                                        className="w-full h-32 p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded resize-none focus:outline-none"
                                    />
                                </div>
                            </div>
                         )}
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Admin Upload Configuration Modal */}
      {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-dragon-700 p-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5" /> Upload Configuration
                    </h3>
                    <p className="text-dragon-100 text-xs mt-1">Select the doctor and template for this batch.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Assign to Doctor</label>
                        <select 
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dragon-500/50"
                        >
                            <option value="">-- Select Doctor --</option>
                            {availableDoctors.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.fullName}</option>
                            ))}
                        </select>
                    </div>

                    {selectedDoctor && (
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Word Template Status</h4>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm">
                                    {selectedDoctor.templateBase64 ? (
                                        <span className="text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle2 className="w-4 h-4" /> Active Template Found</span>
                                    ) : (
                                        <span className="text-amber-600 flex items-center gap-1 font-medium"><AlertCircle className="w-4 h-4" /> No Template Set</span>
                                    )}
                                </div>
                            </div>
                            
                            <label className="block text-xs text-slate-500 mb-1 mt-3">Upload New Template (Optional)</label>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <Upload className="w-3 h-3" />
                                        <span className="truncate">{newTemplateFile ? newTemplateFile.name : "Choose .docx file..."}</span>
                                    </div>
                                    <input type="file" accept=".docx" className="hidden" onChange={(e) => e.target.files && setNewTemplateFile(e.target.files[0])} />
                                </label>
                                {newTemplateFile && (
                                    <button onClick={() => setNewTemplateFile(null)} className="p-1 text-slate-400 hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                             {newTemplateFile && (
                                <p className="text-[10px] text-emerald-600 mt-1">
                                    * This template will be saved to {selectedDoctor.fullName}'s profile.
                                </p>
                            )}
                        </div>
                    )}
                    
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        Adding <strong>{pendingUploadFiles.length}</strong> audio files to queue.
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                     <button 
                        onClick={() => {
                            setIsConfigModalOpen(false);
                            setPendingUploadFiles([]);
                            setNewTemplateFile(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmUploadConfiguration}
                        disabled={!selectedDoctorId}
                        className="px-4 py-2 text-sm font-medium text-white bg-dragon-600 hover:bg-dragon-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Start Upload
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* Template Export Modal */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-white">Export with Template</h3>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                          Select a patient record from the <strong>Invoice Extractor</strong> to merge with this transcription.
                      </p>
                      
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Select Patient</label>
                          <select 
                            value={selectedPatientId}
                            onChange={(e) => setSelectedPatientId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dragon-500/50"
                          >
                              <option value="">-- Choose a Patient --</option>
                              {invoices.filter(inv => inv.status === 'COMPLETED').map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                      {inv.data?.["Patient Name"]} (DOB: {inv.data?.DOB})
                                  </option>
                              ))}
                          </select>
                          {invoices.length === 0 && (
                              <p className="text-xs text-amber-600 mt-1">No patient data found. Please upload images to Invoices list first.</p>
                          )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                          <p className="font-semibold mb-1">Merge Details:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                              <li>Template: <strong>{currentUser?.role === UserRole.SUPERADMIN ? "Assigned Doctor's Template" : "Your Uploaded Template"}</strong></li>
                              <li>Patient: <strong>{invoices.find(i => i.id === selectedPatientId)?.data?.["Patient Name"] || "None"}</strong></li>
                          </ul>
                          <p className="mt-2 text-emerald-600 font-medium">Filename format: Patient Name_DD-MM-YYYY</p>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                      <button 
                        onClick={() => setIsTemplateModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleGenerateTemplate}
                        disabled={!selectedPatientId}
                        className="px-4 py-2 text-sm font-medium text-white bg-dragon-600 hover:bg-dragon-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          Generate Document
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FileUploadView;
