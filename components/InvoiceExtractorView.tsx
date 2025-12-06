import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage, Download, Plus, Loader2, AlertCircle, FileSpreadsheet, Trash2 } from 'lucide-react';
import { InvoiceData } from '../types';
import { exportInvoiceToExcel } from '../utils/exportUtils';

interface InvoiceExtractorViewProps {
  invoices: InvoiceData[];
  setInvoices: React.Dispatch<React.SetStateAction<InvoiceData[]>>;
  onProcessInvoices: (files: File[]) => void;
}

const InvoiceExtractorView: React.FC<InvoiceExtractorViewProps> = ({ invoices, setInvoices, onProcessInvoices }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onProcessInvoices(Array.from(e.target.files) as File[]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const validFiles = filesArray.filter((f: File) => f.type.startsWith('image/'));
      if (validFiles.length > 0) onProcessInvoices(validFiles);
    }
  };

  const handleRemove = (id: string) => {
      setInvoices(prev => {
          const filtered = prev.filter(i => i.id !== id);
          // Re-index Sl No
          return filtered.map((item, idx) => {
              if (item.data) {
                  return { ...item, data: { ...item.data, "Sl No": (idx + 1).toString() }};
              }
              return item;
          });
      });
  };

  const handleClearAll = () => {
      if(confirm("Clear all extracted data?")) {
          setInvoices([]);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
               Image-to-Invoice Extractor
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
               Upload medical images to extract structured billing data. 
               This data will be available for merging with transcription templates.
           </p>
        </div>
        
        <div className="flex gap-2">
           {invoices.length > 0 && (
               <button 
                  onClick={handleClearAll}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
               >
                   Clear All
               </button>
           )}
           <button 
              onClick={() => exportInvoiceToExcel(invoices)}
              disabled={invoices.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
           >
               <Download className="w-4 h-4" /> Export Excel
           </button>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`bg-white dark:bg-slate-900 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            dragOver 
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-full mb-3">
              <UploadCloud className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-200">Click to upload or drag and drop</p>
          <p className="text-sm text-slate-400">Supports JPG, PNG, WEBP</p>
          <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept="image/*" 
             multiple 
             onChange={onFileSelect} 
          />
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                     <tr>
                         <th className="px-4 py-3 w-10">Sl No</th>
                         <th className="px-4 py-3">Patient Name</th>
                         <th className="px-4 py-3">DOB</th>
                         <th className="px-4 py-3">Insurance</th>
                         <th className="px-4 py-3">Amount</th>
                         <th className="px-4 py-3">Status</th>
                         <th className="px-4 py-3 text-right">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {invoices.length === 0 ? (
                         <tr>
                             <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                 No data extracted yet. Upload images to begin.
                             </td>
                         </tr>
                     ) : (
                         invoices.map((inv, idx) => (
                             <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                 <td className="px-4 py-3 font-mono text-slate-500">
                                     {inv.data?.["Sl No"] || (idx + 1)}
                                 </td>
                                 <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                     {inv.data?.["Patient Name"] || '-'}
                                 </td>
                                 <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                     {inv.data?.DOB || '-'}
                                 </td>
                                 <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                     {inv.data?.Insurance || '-'}
                                 </td>
                                 <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">
                                     {inv.data?.Amount || '-'}
                                 </td>
                                 <td className="px-4 py-3">
                                     {inv.status === 'PROCESSING' && (
                                         <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                             <Loader2 className="w-3 h-3 animate-spin" /> Processing
                                         </span>
                                     )}
                                     {inv.status === 'COMPLETED' && (
                                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                             Success
                                         </span>
                                     )}
                                     {inv.status === 'ERROR' && (
                                         <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" title={inv.error}>
                                             <AlertCircle className="w-3 h-3" /> Error
                                         </span>
                                     )}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                     <button 
                                        onClick={() => handleRemove(inv.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                     >
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};

export default InvoiceExtractorView;