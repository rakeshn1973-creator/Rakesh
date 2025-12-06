
import React, { useState, useRef } from 'react';
import { User, UserRole, AppPermission } from '../types';
import { addUser, deleteUser, getUsers, saveUserTemplate, updateUserPermissions } from '../services/storageService';
import { UserPlus, Trash2, Shield, User as UserIcon, Keyboard, FileText, Upload, Key, X, Check, ToggleLeft, ToggleRight, ArrowLeft, Info } from 'lucide-react';
import { fileToBase64 } from '../utils/audioUtils';

interface UserManagementViewProps {
  currentUser?: User; // Optional: Only allow modifying own template if not admin
  onUserUpdate?: (user: User) => void;
  onExit?: () => void;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser, onUserUpdate, onExit }) => {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.TYPIST);
  const [error, setError] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission Modal State
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newFullName) {
        setError("Please fill all fields");
        return;
    }
    try {
      addUser(newUsername, newFullName, newRole);
      setUsers(getUsers());
      setNewUsername('');
      setNewFullName('');
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
        deleteUser(id);
        setUsers(getUsers());
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
        const file = e.target.files[0];
        if (!file.name.endsWith('.docx')) {
            setTemplateMessage("Error: Only .docx files are supported.");
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            const updatedUser = saveUserTemplate(currentUser.id, base64);
            if (updatedUser && onUserUpdate) {
                onUserUpdate(updatedUser);
                setTemplateMessage("Template saved successfully!");
            }
        } catch (err) {
            setTemplateMessage("Failed to upload template.");
        }
    }
  };

  const togglePermission = (perm: AppPermission) => {
      if (!editingPermissionsUser) return;
      const currentPerms = editingPermissionsUser.permissions || [];
      let newPerms: AppPermission[];

      if (currentPerms.includes(perm)) {
          newPerms = currentPerms.filter(p => p !== perm);
      } else {
          newPerms = [...currentPerms, perm];
      }
      
      // Optimistic update for UI
      setEditingPermissionsUser({ ...editingPermissionsUser, permissions: newPerms });
  };

  const savePermissions = () => {
      if (editingPermissionsUser) {
          updateUserPermissions(editingPermissionsUser.id, editingPermissionsUser.permissions);
          setUsers(getUsers()); // Refresh list
          setEditingPermissionsUser(null);
      }
  };

  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPERADMIN: return <Shield className="w-4 h-4 text-purple-600" />;
          case UserRole.DOCTOR: return <UserIcon className="w-4 h-4 text-blue-600" />;
          case UserRole.TYPIST: return <Keyboard className="w-4 h-4 text-emerald-600" />;
      }
  };

  // Structured Rights for Better UI
  const PERMISSION_GROUPS = [
    {
        category: "Modules & Inputs",
        rights: [
            { key: 'CAN_UPLOAD_AUDIO', label: 'Audio Uploads', desc: 'Allows uploading audio files for transcription.' },
            { key: 'CAN_USE_LIVE_DICTATION', label: 'Live Dictation', desc: 'Access to the real-time speech recognition module.' },
            { key: 'CAN_EXTRACT_INVOICES', label: 'Invoice Extractor', desc: 'Access to the Image-to-Data extraction tool.' },
        ]
    },
    {
        category: "Workflow & Editing",
        rights: [
            { key: 'CAN_EDIT_TRANSCRIPTS', label: 'Edit Transcripts', desc: 'Allows modifying text in the editor.' },
            { key: 'CAN_FINALIZE_JOBS', label: 'Finalize & Learn', desc: 'Can mark jobs as complete and update AI learning model.' },
            { key: 'CAN_VIEW_REPORTS', label: 'View Reports', desc: 'Access to the Reports dashboard.' },
        ]
    },
    {
        category: "Administration",
        rights: [
            { key: 'CAN_MANAGE_USERS', label: 'User Management', desc: 'Can add, remove, and modify other users.' },
        ]
    }
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-dragon-600" />
                User Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage accounts, roles, and access rights.</p>
          </div>
          {onExit && (
              <button 
                  onClick={onExit}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                  <ArrowLeft className="w-4 h-4" /> Exit
              </button>
          )}
      </div>
      
      {/* Template Management Section (Visible to Doctors/Typists/Admins for themselves) */}
      {currentUser && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Your Reporting Template
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                        Upload a Word document (.docx) to serve as your base letterhead. 
                        The system will replace placeholders in this document with extracted data and transcription text.
                    </p>
                    
                    <div className="flex items-center gap-4 mb-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
                        >
                            <Upload className="w-4 h-4" />
                            {currentUser.templateBase64 ? "Update Template" : "Upload Template"}
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleTemplateUpload} 
                            accept=".docx" 
                            className="hidden" 
                        />
                        {currentUser.templateBase64 && (
                            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded flex items-center gap-1">
                                <Check className="w-3 h-3" /> Active
                            </span>
                        )}
                    </div>
                    {templateMessage && (
                        <p className={`mt-2 text-sm ${templateMessage.includes('Error') ? 'text-red-500' : 'text-emerald-500'}`}>
                            {templateMessage}
                        </p>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Supported Template Tags
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">Add these exactly as shown into your Word file:</p>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="flex flex-col">
                            <span className="font-mono text-dragon-700 dark:text-dragon-400">{`{Body}`}</span>
                            <span className="text-xs text-slate-500">The Transcribed Text</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-mono text-blue-600 dark:text-blue-400">{`{Patient Name}`}</span>
                            <span className="text-xs text-slate-500">From Invoice</span>
                        </div>
                        <div className="flex flex-col">
                             <span className="font-mono text-blue-600 dark:text-blue-400">{`{DOB}`}</span>
                             <span className="text-xs text-slate-500">Date of Birth</span>
                        </div>
                         <div className="flex flex-col">
                             <span className="font-mono text-blue-600 dark:text-blue-400">{`{Date}`}</span>
                             <span className="text-xs text-slate-500">Current Date (UK)</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 italic">
                        Tip: You can also use {`{Transcript}`} or {`{Report}`} as aliases for the body text.
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* Admin User Management */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-dragon-600" />
            Add New User
        </h2>
        <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Username</label>
            <input 
              type="text" 
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-dragon-500/50"
              placeholder="jdoe"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
            <input 
              type="text" 
              value={newFullName}
              onChange={e => setNewFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-dragon-500/50"
              placeholder="John Doe"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Role</label>
            <select 
              value={newRole}
              onChange={e => setNewRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-dragon-500/50"
            >
                <option value={UserRole.TYPIST}>Typist</option>
                <option value={UserRole.DOCTOR}>Doctor</option>
                <option value={UserRole.SUPERADMIN}>Superadmin</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full md:w-auto px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Add User
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
         <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
             <h3 className="font-semibold text-slate-700 dark:text-slate-200">System Users</h3>
         </div>
         <table className="w-full text-left text-sm">
             <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800">
                 <tr>
                     <th className="px-6 py-3">User</th>
                     <th className="px-6 py-3">Role</th>
                     <th className="px-6 py-3">Access Rights</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {users.map(user => (
                     <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                         <td className="px-6 py-4">
                             <div className="font-medium text-slate-900 dark:text-white">{user.fullName}</div>
                             <div className="text-slate-400 text-xs">@{user.username}</div>
                         </td>
                         <td className="px-6 py-4">
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                 {getRoleIcon(user.role)}
                                 {user.role}
                             </span>
                         </td>
                         <td className="px-6 py-4">
                             <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                 {(user.permissions || []).length} Permission(s) Granted
                             </span>
                         </td>
                         <td className="px-6 py-4 text-right flex justify-end gap-2">
                             <button 
                                onClick={() => setEditingPermissionsUser(user)}
                                className="px-3 py-1.5 text-xs font-medium text-dragon-700 dark:text-dragon-400 bg-dragon-50 dark:bg-dragon-900/20 border border-dragon-200 dark:border-dragon-800 rounded-lg hover:bg-dragon-100 dark:hover:bg-dragon-900/40 transition-colors flex items-center gap-1"
                             >
                                 <Shield className="w-3 h-3" /> Manage Access
                             </button>
                             {user.username !== 'admin' && (
                                 <button 
                                    onClick={() => handleDelete(user.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete User"
                                 >
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             )}
                         </td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>

      {/* Permissions Modal */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                            <Key className="w-5 h-5 text-dragon-600" />
                            Access Control
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Configure rights for <span className="font-semibold text-slate-900 dark:text-white">{editingPermissionsUser.fullName}</span> ({editingPermissionsUser.role})
                        </p>
                    </div>
                    <button onClick={() => setEditingPermissionsUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Permissions Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-6">
                        {PERMISSION_GROUPS.map((group, idx) => (
                            <div key={idx}>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">
                                    {group.category}
                                </h4>
                                <div className="space-y-2">
                                    {group.rights.map((right) => {
                                        const isChecked = editingPermissionsUser.permissions?.includes(right.key as AppPermission);
                                        return (
                                            <div 
                                                key={right.key} 
                                                onClick={() => togglePermission(right.key as AppPermission)}
                                                className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                                    isChecked 
                                                    ? 'bg-dragon-50/50 dark:bg-dragon-900/10 border-dragon-200 dark:border-dragon-800/50' 
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-dragon-200 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                <div className="flex-1 pr-4">
                                                    <p className={`text-sm font-semibold ${isChecked ? 'text-dragon-900 dark:text-dragon-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {right.label}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                                                        {right.desc}
                                                    </p>
                                                </div>
                                                <div className={`transition-colors duration-200 ${isChecked ? 'text-dragon-600' : 'text-slate-300 dark:text-slate-600'}`}>
                                                    {isChecked ? (
                                                        <ToggleRight className="w-8 h-8 fill-current" />
                                                    ) : (
                                                        <ToggleLeft className="w-8 h-8 fill-current" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={() => setEditingPermissionsUser(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Exit
                    </button>
                    <button 
                        onClick={savePermissions}
                        className="px-6 py-2 text-sm font-medium text-white bg-dragon-600 hover:bg-dragon-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default UserManagementView;
