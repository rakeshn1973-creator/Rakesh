import React, { useState, useEffect } from 'react';
import { getDashboardStats, getJobs, getUsers, assignJob } from '../services/storageService';
import { JobRecord, User, UserRole } from '../types';
import { LayoutDashboard, Users, FileText, CheckCircle, Clock, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';

const MasterDashboard: React.FC = () => {
    const [stats, setStats] = useState(getDashboardStats());
    const [jobs, setJobs] = useState<JobRecord[]>(getJobs());
    const [users] = useState<User[]>(getUsers());
    const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);

    const typists = users.filter(u => u.role === UserRole.TYPIST);
    const doctors = users.filter(u => u.role === UserRole.DOCTOR);

    const refreshData = () => {
        setStats(getDashboardStats());
        setJobs(getJobs());
    };

    const handleAssign = (jobId: string, typistId: string) => {
        const typist = typists.find(t => t.id === typistId);
        if (typist) {
            assignJob(jobId, typist.id, typist.fullName);
            refreshData();
        }
    };

    const toggleDoctor = (id: string) => {
        setExpandedDoctorId(expandedDoctorId === id ? null : id);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <LayoutDashboard className="w-8 h-8 text-dragon-700" />
                        Master Dashboard
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Monitor production, assign workflows, and manage quality control.
                    </p>
                </div>
                <div className="flex gap-4">
                     <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                         <span className="text-xs text-slate-500 font-semibold uppercase">Total Jobs</span>
                         <span className="text-xl font-bold text-slate-800 dark:text-white">{stats.totalJobs}</span>
                     </div>
                     <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                         <span className="text-xs text-amber-500 font-semibold uppercase">Pending</span>
                         <span className="text-xl font-bold text-amber-600">{stats.pending}</span>
                     </div>
                     <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                         <span className="text-xs text-emerald-500 font-semibold uppercase">Finalized</span>
                         <span className="text-xl font-bold text-emerald-600">{stats.finalized}</span>
                     </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Workforce Overview</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {doctors.map(doc => {
                        const docJobs = jobs.filter(j => j.userId === doc.id);
                        const isExpanded = expandedDoctorId === doc.id;
                        
                        return (
                            <div key={doc.id} className="bg-white dark:bg-slate-900">
                                <div 
                                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    onClick={() => toggleDoctor(doc.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{doc.fullName}</h4>
                                            <span className="text-xs text-slate-500">{docJobs.length} Jobs Total</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-8 text-sm">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Clock className="w-4 h-4" />
                                            <span className="font-medium">{docJobs.filter(j => j.status === 'PENDING' || j.status === 'ASSIGNED').length} Active</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="font-medium">{docJobs.filter(j => j.status === 'FINALIZED').length} Final</span>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-slate-50 dark:bg-slate-950/50 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <th className="py-2 text-left">Job Number</th>
                                                    <th className="py-2 text-left">File Name</th>
                                                    <th className="py-2 text-left">Uploaded</th>
                                                    <th className="py-2 text-left">Status</th>
                                                    <th className="py-2 text-left">Assigned To</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {docJobs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-4 text-center text-slate-400 italic">No jobs found for this doctor.</td>
                                                    </tr>
                                                ) : (
                                                    docJobs.map(job => (
                                                        <tr key={job.id}>
                                                            <td className="py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{job.jobNumber}</td>
                                                            <td className="py-3 text-slate-900 dark:text-slate-200">{job.fileName}</td>
                                                            <td className="py-3 text-slate-500">{new Date(job.uploadDate).toLocaleDateString()}</td>
                                                            <td className="py-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    job.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' :
                                                                    job.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                    {job.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3">
                                                                {job.status === 'FINALIZED' ? (
                                                                    <span className="text-slate-500">{job.assignedTypistName || 'Self'}</span>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <select 
                                                                            value={job.assignedTypistId || ''}
                                                                            onChange={(e) => handleAssign(job.id, e.target.value)}
                                                                            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                                                                        >
                                                                            <option value="">-- Assign Typist --</option>
                                                                            {typists.map(t => (
                                                                                <option key={t.id} value={t.id}>{t.fullName}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MasterDashboard;