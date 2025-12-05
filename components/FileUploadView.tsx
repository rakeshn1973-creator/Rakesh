
import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileIcon, X, Loader2, CheckCircle2, FileText, Download, AlertCircle, PlayCircle, RefreshCw, Eye, Copy, Search, Trash2, ChevronDown, ChevronUp, FileOutput, Wand2, Save } from 'lucide-react';
import { BatchFile, FileStatus, InvoiceData, User } from '../types';
import { exportBatch, downloadDoc, downloadText, generateWordFromTemplate } from '../utils/exportUtils';
import { formatTime } from '../utils/audioUtils';
import { getJobs, finalizeJob } from '../services/storageService';

interface FileUploadViewProps {
  files: BatchFile[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onSelectFile: (id: string) => void;
  selectedFileId: string | null;
  onProcessBatch: () => void;
  isProcessing: boolean;
  invoices?: InvoiceData[]; 
  currentUser?: User;
}

const FileUploadView: React.FC<FileUploadViewProps> = ({ 
  files, 
  onFilesAdded, 
  onRemoveFile, 
  onSelectFile,
  selectedFileId,
  onProcessBatch,
  isProcessing,
  invoices = [],
  currentUser
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateFileId, setTemplateFileId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Editing State
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const canFinalize = currentUser?.permissions?.includes('CAN_FINALIZE_JOBS');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
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
      const audioFiles = Array.from(e.dataTransfer.files).filter((f: File) => 
        f.type.startsWith('audio/') || 
        f.name.endsWith('.dss') || 
        f.name.endsWith('.ds2') || 
        f.name.endsWith('.waptt') ||
        f.name.endsWith('.mp3') ||
        f.name.endsWith('.wav') ||
        f.name.endsWith('.m4a')
      );
      if (audioFiles.length > 0) {
        onFilesAdded(audioFiles);
      }
    }
  };

  const togglePreview = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (expandedFileId === id) {
        setExpandedFileId(null);
    } else {
        const file = files.find(f => f.id === id);
        if (file) {
            setEditBuffer(file.transcript);
            setExpandedFileId(id);
        }
    }
  };

  const handleFinalize = async (fileId: string) => {
      if (!canFinalize) {
          alert("You do not have permission to finalize jobs.");
          return;
      }
      setIsSaving(true);
      // Find associated job (simple lookup by filename/user for demo)
      const jobs = getJobs();
      const file = files.find(f => f.id === fileId);
      if (file && currentUser) {
          // In a real app we'd link ID directly, here we fallback to finding the job we just created
          const job = jobs.find(j => j.fileName === file.fileName && j.userId === currentUser.id);
          if (job) {
             finalizeJob(job.id, editBuffer);
             
             // Update local file state to reflect changes if needed
             file.transcript = editBuffer;
             
             alert("Job Finalized! The system has learned from your edits.");
          } else {
             alert("Job record not found. Saved locally only.");
          }
      }
      setIsSaving(false);
  };

  const openTemplateModal = (fileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentUser?.templateBase64) {
          alert("Please upload a base Word Template in the 'Users' tab first.");
          return;
      }
      setTemplateFileId(fileId);
      setIsTemplateModalOpen(true);
      setSelectedPatientId('');
  };

  const handleGenerateTemplate = () => {
      const file = files.find(f => f.id === templateFileId);
      const patient = invoices.find(i => i.id === selectedPatientId);

      if (!file || !patient || !currentUser?.templateBase64) {
          alert("Error: Missing file, patient, or template.");
          return;
      }

      if (!patient.data) {
          alert("Selected patient has no extracted data.");
          return;
      }

      // Use editBuffer if this file is currently expanded/edited, otherwise transcript
      const textToUse = (expandedFileId === file.id) ? editBuffer : file.transcript;

      const success = generateWordFromTemplate(
          currentUser.templateBase64,
          textToUse,
          patient.data
      );

      if (success) {
          setIsTemplateModalOpen(false);
          setTemplateFileId(null);
      }
  };

  const filteredFiles = files.filter(f => f.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
  const completedCount = files.filter(f => f.status === FileStatus.COMPLETED).length;

  const StatusBadge = ({ file }: { file: BatchFile }) => {
    switch (file.status) {
      case FileStatus.CONVERTING:
        return (
          <div className="flex flex-col gap-1 w-full max-w-[140px]">
            <div className="flex justify-between items-center text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Converting...
              </span>
              <span>{Math.round(file.progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${file.progress}%` }} />
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
              <span>{Math.round(file.progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${file.progress}%` }} />
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
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
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
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Upload Audio Files</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-4">
          Drag & drop files or click to browse.<br/>Supports MP3, WAV, M4A, DSS, DS2.
        </p>
        <button className="px-5 py-2 bg-dragon-700 text-white text-sm font-semibold rounded-lg hover:bg-dragon-800 transition-colors shadow-sm shadow-dragon-900/20">
          Select Files
        </button>
        <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.dss,.ds2,.waptt"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
      </div>

      {/* Files List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Recent Files</h2>
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-dragon-500/50 focus:border-transparent outline-none w-full sm:w-64 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="col-span-5">File Name</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredFiles.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <FileIcon className="w-12 h-12 mb-3 opacity-20" />
              <p>No files found.</p>
            </div>
          ) : (
            filteredFiles.map(file => (
              <div key={file.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900">
                {/* Main Row */}
                <div 
                  className="sm:grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
                  onClick={() => togglePreview(file.id)}
                >
                  {/* Name */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${file.status === FileStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-200 truncate">{file.fileName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="col-span-2 text-sm text-slate-600 dark:text-slate-400 hidden sm:block">
                     {file.durationSeconds ? formatTime(file.durationSeconds * 1000) : '--:--'}
                  </div>

                  {/* Status */}
                  <div className="col-span-3 flex items-center">
                    <StatusBadge file={file} />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {file.status === FileStatus.COMPLETED ? (
                      <>
                        <button 
                          onClick={(e) => openTemplateModal(file.id, e)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          title="Generate from Template"
                        >
                          <FileOutput className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => downloadDoc(file.fileName, file.transcript)}
                          className="p-1.5 text-slate-400 hover:text-dragon-600 dark:hover:text-dragon-400 transition-colors"
                          title="Download Word"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => togglePreview(file.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit Transcript"
                        >
                          {expandedFileId === file.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </>
                    ) : (
                        <button 
                            onClick={() => onRemoveFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove File"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                </div>

                {/* Expanded Preview (Editable) */}
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
                                    onClick={() => handleFinalize(file.id)}
                                    disabled={isSaving}
                                    className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1"
                                    title="Save as Final and Learn"
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

      {/* Template Selection Modal */}
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
                              <p className="text-xs text-amber-600 mt-1">No patient data found. Please upload images in the 'Invoices' tab.</p>
                          )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                          <p className="font-semibold mb-1">Merge Details:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                              <li>Template: <strong>User's Uploaded Word Doc</strong></li>
                              <li>Patient: <strong>{invoices.find(i => i.id === selectedPatientId)?.data?.["Patient Name"] || "None"}</strong></li>
                              <li>Transcript: <strong>{files.find(f => f.id === templateFileId)?.fileName}</strong></li>
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
