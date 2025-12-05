import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileAudio, X, Loader2, CheckCircle2, FileText, Download, AlertCircle, PlayCircle, RefreshCw, ChevronDown, Eye, EyeOff, Copy, FileIcon, Search, Trash2 } from 'lucide-react';
import { BatchFile, FileStatus } from '../types';
import { needsConversion } from '../services/conversionService';
import { exportBatch, downloadDoc, downloadText } from '../utils/exportUtils';
import { formatTime } from '../utils/audioUtils';

interface FileUploadViewProps {
  files: BatchFile[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onSelectFile: (id: string) => void;
  selectedFileId: string | null;
  onProcessBatch: () => void;
  isProcessing: boolean;
}

const FileUploadView: React.FC<FileUploadViewProps> = ({ 
  files, 
  onFilesAdded, 
  onRemoveFile, 
  onSelectFile,
  selectedFileId,
  onProcessBatch,
  isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

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
      // Filter for audio files roughly
      const audioFiles = Array.from(e.dataTransfer.files).filter(f => 
        f.type.startsWith('audio/') || 
        f.name.endsWith('.dss') || 
        f.name.endsWith('.ds2') || 
        f.name.endsWith('.waptt')
      );
      if (audioFiles.length > 0) {
        onFilesAdded(audioFiles);
      }
    }
  };

  const togglePreview = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFileId(expandedFileId === id ? null : id);
  };

  const filteredFiles = files.filter(f => f.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
  const completedCount = files.filter(f => f.status === FileStatus.COMPLETED).length;

  const StatusBadge = ({ file }: { file: BatchFile }) => {
    switch (file.status) {
      case FileStatus.CONVERTING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Converting {file.progress}%
          </span>
        );
      case FileStatus.TRANSCRIBING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Transcribing {file.progress}%
          </span>
        );
      case FileStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        );
      case FileStatus.ERROR:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      default: // QUEUED
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <PlayCircle className="w-3 h-3" />
            Queued
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dashboard Header / Upload Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative bg-white rounded-xl border-2 border-dashed transition-all duration-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer group ${
          isDragOver ? 'border-dragon-500 bg-dragon-50' : 'border-slate-300 hover:border-dragon-400 hover:bg-slate-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-4 bg-dragon-100 rounded-full mb-4 group-hover:scale-110 transition-transform duration-200">
          <UploadCloud className="w-8 h-8 text-dragon-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Audio Files</h3>
        <p className="text-slate-500 max-w-sm mx-auto mb-4">
          Drag and drop your audio files here, or click to browse. Supports MP3, WAV, DSS, DS2, and M4A.
        </p>
        <button className="px-6 py-2 bg-dragon-600 text-white rounded-lg font-semibold hover:bg-dragon-700 transition-colors shadow-sm">
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

      {/* Files Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <h2 className="text-lg font-bold text-slate-800">Your Files</h2>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search files..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-dragon-500/50 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {completedCount > 0 && (
              <div className="flex gap-2">
                 <button 
                  onClick={() => exportBatch(files, 'doc')}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white hover:text-dragon-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export All (DOC)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table View */}
        {files.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400">No files yet. Upload some audio to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="px-6 py-3 w-12">#</th>
                  <th className="px-6 py-3">File Name</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Size</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file, index) => (
                  <React.Fragment key={file.id}>
                    <tr 
                      onClick={() => file.status === FileStatus.COMPLETED && togglePreview(file.id)}
                      className={`group transition-colors ${
                        expandedFileId === file.id ? 'bg-slate-50' : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            file.status === FileStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <FileIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{file.fileName}</p>
                            <p className="text-xs text-slate-500">{new Date(file.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[140px]">
                           <StatusBadge file={file} />
                           {(file.status === FileStatus.TRANSCRIBING || file.status === FileStatus.CONVERTING) && (
                             <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${file.progress}%` }}></div>
                             </div>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">
                        {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {file.status === FileStatus.COMPLETED && (
                            <>
                              <button 
                                onClick={() => downloadDoc(file.fileName, file.transcript)}
                                className="p-2 text-slate-400 hover:text-dragon-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                title="Download Word"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => togglePreview(file.id)}
                                className={`p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200 ${
                                  expandedFileId === file.id ? 'text-dragon-600 bg-white shadow-sm' : 'text-slate-400 hover:text-dragon-600 hover:bg-white'
                                }`}
                                title="View Transcript"
                              >
                                {expandedFileId === file.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => onRemoveFile(file.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Preview Row */}
                    {expandedFileId === file.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transcript Preview</h4>
                               <button 
                                 onClick={() => navigator.clipboard.writeText(file.transcript)}
                                 className="text-xs flex items-center gap-1 text-dragon-600 hover:text-dragon-700 font-medium"
                               >
                                 <Copy className="w-3 h-3" /> Copy Text
                               </button>
                             </div>
                             <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                                <p className="text-sm text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">
                                  {file.transcript}
                                </p>
                             </div>
                             <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-right">
                               <button 
                                 onClick={() => downloadDoc(file.fileName, file.transcript)}
                                 className="text-sm font-medium text-dragon-700 hover:underline"
                               >
                                 Download Full Document &rarr;
                               </button>
                             </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadView;