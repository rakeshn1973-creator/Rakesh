import React, { useState, useMemo } from 'react';
import { getJobs, getUsers } from '../services/storageService';
import { JobRecord, User } from '../types';
import { Calendar, Filter, Download, BarChart3, Clock, Type } from 'lucide-react';
import { exportBatch } from '../utils/exportUtils'; // We can reuse or enhance export logic here

const ReportingView: React.FC = () => {
  const [jobs] = useState<JobRecord[]>(getJobs());
  const [users] = useState<User[]>(getUsers());
  
  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchUser = selectedUser === 'all' || job.userId === selectedUser;
      
      let matchDate = true;
      const jobDate = new Date(job.uploadDate);
      if (startDate) {
          matchDate = matchDate && jobDate >= new Date(startDate);
      }
      if (endDate) {
          // Add one day to include the end date fully
          const end = new Date(endDate);
          end.setDate(end.getDate() + 1);
          matchDate = matchDate && jobDate < end;
      }

      return matchUser && matchDate;
    }).sort((a, b) => b.uploadDate - a.uploadDate);
  }, [jobs, selectedUser, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      totalJobs: filteredJobs.length,
      totalChars: filteredJobs.reduce((acc, job) => acc + job.charCountWithSpaces, 0),
      totalMins: filteredJobs.reduce((acc, job) => acc + (job.audioLengthSeconds / 60), 0),
    };
  }, [filteredJobs]);

  const downloadReportCSV = () => {
      const headers = ['Date', 'Job Number', 'User', 'File Name', 'Audio (mins)', 'Characters', 'Words'];
      const rows = filteredJobs.map(j => [
          new Date(j.uploadDate).toLocaleDateString(),
          j.jobNumber,
          j.userName,
          j.fileName,
          (j.audioLengthSeconds / 60).toFixed(2),
          j.charCountWithSpaces,
          j.wordCount
      ]);
      
      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">Total Jobs</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalJobs}</h3>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Clock className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">Total Audio (Mins)</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalMins.toFixed(2)}</h3>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Type className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">Total Characters</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalChars.toLocaleString()}</h3>
            </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
         <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Filter by User</label>
            <div className="relative">
                <select 
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg appearance-none bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-dragon-500/50 transition-colors"
                >
                    <option value="all">All Users</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                    ))}
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
         </div>
         <div className="flex-1 w-full">
             <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
             <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-dragon-500/50"
             />
         </div>
         <div className="flex-1 w-full">
             <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
             <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-dragon-500/50"
             />
         </div>
         <button 
           onClick={downloadReportCSV}
           className="w-full md:w-auto px-4 py-2 bg-dragon-600 text-white rounded-lg font-medium hover:bg-dragon-700 transition-colors flex items-center justify-center gap-2"
         >
             <Download className="w-4 h-4" /> Export CSV
         </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Job Number</th>
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">File Name</th>
                        <th className="px-6 py-3 text-right">Audio (Min)</th>
                        <th className="px-6 py-3 text-right">Chars (Space)</th>
                        <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredJobs.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">
                                No records found for selected filters.
                            </td>
                        </tr>
                    ) : (
                        filteredJobs.map(job => (
                            <tr key={job.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-slate-600">
                                    {new Date(job.uploadDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                    {job.jobNumber}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-medium text-slate-900">{job.userName}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]" title={job.fileName}>
                                    {job.fileName}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-600">
                                    {(job.audioLengthSeconds / 60).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-600">
                                    {job.charCountWithSpaces.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                        {job.status}
                                    </span>
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

export default ReportingView;
