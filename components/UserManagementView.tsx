
import React, { useState, useRef } from 'react';
import { User, UserRole, AppPermission } from '../types';
import { addUser, deleteUser, getUsers, saveUserTemplate, updateUserPermissions } from '../services/storageService';
import { UserPlus, Trash2, Shield, User as UserIcon, Keyboard, FileText, Upload, Key, X, CheckSquare, Square } from 'lucide-react';
import { fileToBase64 } from '../utils/audioUtils';

interface UserManagementViewProps {
  currentUser?: User; // Optional: Only allow modifying own template if not admin
  onUserUpdate?: (user: User) => void;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser, onUserUpdate }) => {
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

  const AVAILABLE_RIGHTS: { key: AppPermission; label: string }[] = [
      { key: 'CAN_UPLOAD_AUDIO', label: 'Upload Audio Files' },
      { key: 'CAN_USE_LIVE_DICTATION', label: 'Use Live Dictation' },
      { key: 'CAN_EXTRACT_INVOICES', label: 'Extract Data from Images' },
      { key: 'CAN_VIEW_REPORTS', label: 'View Reports' },
      { key: 'CAN_EDIT_TRANSCRIPTS', label: 'Edit Transcripts' },
      { key: 'CAN_FINALIZE_JOBS', label: 'Finalize & Teach AI' },
      { key: 'CAN_MANAGE_USERS', label: 'Manage Users (Admin)' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Template Management Section (Visible to Doctors/Typists/Admins for themselves) */}
      {currentUser && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Your Reporting Template
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Upload a Word document (.docx) to serve as your base letterhead. 
                Use placeholders like <strong>{`{Patient Name}`}</strong>, <strong>{`{DOB}`}</strong>, <strong>{`{Body}`}</strong> in your Word file.
            </p>
            
            <div className="flex items-center gap-4">
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
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                        Template Active
                    </span>
                )}
            </div>
            {templateMessage && (
                <p className={`mt-2 text-sm ${templateMessage.includes('Error') ? 'text-red-500' : 'text-emerald-500'}`}>
                    {templateMessage}
                </p>
            )}
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
                     <th className="px-6 py-3">Rights</th>
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
                             <span className="text-xs text-slate-500 dark:text-slate-400">
                                 {(user.permissions || []).length} Enabled
                             </span>
                         </td>
                         <td className="px-6 py-4 text-right flex justify-end gap-2">
                             <button 
                                onClick={() => setEditingPermissionsUser(user)}
                                className="p-2 text-slate-400 hover:text-dragon-600 hover:bg-dragon-50 dark:hover:bg-dragon-900/20 rounded-lg transition-colors"
                                title="Manage Rights"
                             >
                                 <Key className="w-4 h-4" />
                             </button>
                             {user.username !== 'admin' && (
                                 <button 
                                    onClick={() => handleDelete(user.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-dragon-600" />
                        Assign Rights
                    </h3>
                    <button onClick={() => setEditingPermissionsUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                        Managing access for <strong className="text-slate-900 dark:text-white">{editingPermissionsUser.fullName}</strong>.
                    </div>
                    <div className="space-y-3">
                        {AVAILABLE_RIGHTS.map((right) => {
                            const isChecked = editingPermissionsUser.permissions?.includes(right.key);
                            return (
                                <div 
                                    key={right.key} 
                                    onClick={() => togglePermission(right.key)}
                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{right.label}</span>
                                    {isChecked ? (
                                        <CheckSquare className="w-5 h-5 text-dragon-600" />
                                    ) : (
                                        <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button 
                        onClick={() => setEditingPermissionsUser(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={savePermissions}
                        className="px-4 py-2 text-sm font-medium text-white bg-dragon-600 hover:bg-dragon-700 rounded-lg transition-colors shadow-sm"
                    >
                        Save Rights
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default UserManagementView;
