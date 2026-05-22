import { useState, useEffect, FormEvent } from 'react';
import { 
  UserCog, 
  UserPlus, 
  ShieldAlert, 
  ShieldCheck, 
  Search,
  MoreVertical,
  Edit2,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/utils';

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([
    { id: "SUPER_ADMIN", name: "Super Admin", description: "Full system access" },
    { id: "CTE_ADMIN", name: "CTE Admin", description: "Department level administration" },
    { id: "PRINCIPAL", name: "Principal", description: "Institution level management" },
    { id: "DATA_ENTRY", name: "Data Entry", description: "Record management" },
    { id: "AUDITOR", name: "Auditor", description: "View-only access for audits" },
    { id: "EMPLOYEE", name: "Employee", description: "Staff portal access" }
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  
  // Firebase manual synchronization panel state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<any | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleForceSync = async () => {
    setSyncLoading(true);
    setSyncResults(null);
    setSyncError(null);
    try {
      const token = localStorage.getItem('dte_token');
      const res = await fetch('/api/admin/sync-firebase', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResults(data);
      } else {
        setSyncError(data.error || "Failed to synchronize to Firebase. Make sure Firestore is provisioned.");
      }
    } catch (e: any) {
      setSyncError(e.message || "Network error occurred");
    } finally {
      setSyncLoading(false);
    }
  };

  // New user form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    displayName: '',
    role: 'EMPLOYEE',
    institutionId: ''
  });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('dte_token');
      const res = await fetch('/api/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("Users API returned non-array:", data);
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const token = localStorage.getItem('dte_token');
      const iRes = await fetch('/api/institutions', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const iData = await iRes.json();
      if (Array.isArray(iData)) setInstitutions(iData);
    } catch (e) { console.error(e); }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('dte_token');
      const rRes = await fetch('/api/roles', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const rData = await rRes.json();
      if (Array.isArray(rData)) setRoles(rData);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchUsers();
    fetchInstitutions();
    fetchRoles();
  }, []);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Submitting form with data:", formData);
    try {
      const token = localStorage.getItem('dte_token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });
      
      const responseData = await res.json();
      console.log("Server response:", responseData);

      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
        setFormData({
          username: '', password: '', email: '', displayName: '', role: 'EMPLOYEE', institutionId: ''
        });
      } else {
        alert(responseData.error || "Failed to create user");
      }
    } catch (err: any) {
      console.error("Fetch error while creating user:", err);
      alert("Network error: " + err.message);
    }
  };

  const handleToggleDisable = async (uid: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('dte_token');
      await fetch(`/api/users/${uid}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ disabled: !currentStatus })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage administrative accounts and system access roles.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-tg-green text-white font-bold text-sm rounded-xl hover:bg-tg-dark shadow-lg transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Create Admin User
        </button>
      </div>

      {/* Firebase Database Sync Panel */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-tg-green/10 flex items-center justify-center text-tg-green shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Google Cloud Firestore Integration</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure all system users and administrative roles are completely stored and active in Firestore.
              </p>
            </div>
          </div>
          <button
            onClick={handleForceSync}
            disabled={syncLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-850 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
            {syncLoading ? 'Syncing to Cloud...' : 'Force Sync to Firestore'}
          </button>
        </div>

        {syncResults && (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Database Synchronized successfully! Official connection established to Firestore.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-100/50">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Users / Creds</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {syncResults.users.successful} / {syncResults.users.attempted}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-100/50">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Institutions</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {syncResults.institutions.successful} / {syncResults.institutions.attempted}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-100/50">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Employees</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {syncResults.employees.successful} / {syncResults.employees.attempted}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-100/50">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Roles</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {syncResults.roles.successful} / {syncResults.roles.attempted}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-100/50 col-span-2 sm:col-span-1">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Audit Logs</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {syncResults.auditLogs.successful} / {syncResults.auditLogs.attempted}
                </span>
              </div>
            </div>
          </div>
        )}

        {syncError && (
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-2.5 text-rose-800 font-medium text-xs animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Sync warning / failure</p>
              <p className="text-[11px] opacity-90 mt-0.5">{syncError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search users by name or username..." 
          className="w-full pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tg-green/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading users...</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                        {u.displayName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{u.displayName}</p>
                        <p className="text-xs text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[10px] text-tg-green uppercase tracking-widest">
                        {roles.find(r => r.id === u.role)?.name || u.role}
                      </span>
                      {u.institutionId && (
                        <span className="text-[10px] text-slate-400">
                          {institutions.find(i => i.id === u.institutionId)?.name || u.institutionId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.disabled ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {u.disabled ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                      {u.disabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => handleToggleDisable(u.uid, u.disabled)}
                        className={`text-[10px] font-bold px-3 py-1 rounded border transition-all ${u.disabled ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}
                       >
                         {u.disabled ? 'Enable' : 'Disable'}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="tg-gradient p-8 text-white shrink-0">
              <h3 className="text-2xl font-bold">New User Account</h3>
              <p className="text-white/60 text-sm mt-1">Fill in the credentials for the new administrator.</p>
            </div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-4 overflow-y-auto flex-1">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Username</label>
                    <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Full Name</label>
                    <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Email Address</label>
                  <input type="email" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Password</label>
                    <input type="password" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Role</label>
                    <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                      value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="">Select Role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
               </div>
               {(formData.role === 'PRINCIPAL' || formData.role === 'DATA_ENTRY') && (
                 <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                   <label className="text-xs font-bold text-slate-500">Assigned Institution</label>
                   <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                     value={formData.institutionId} onChange={e => setFormData({...formData, institutionId: e.target.value})}>
                     <option value="">Select Institution</option>
                     {institutions.map(inst => (
                       <option key={inst.id} value={inst.id}>{inst.name}</option>
                     ))}
                   </select>
                 </div>
               )}
               <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 h-12 bg-tg-green text-white font-bold rounded-xl shadow-lg shadow-emerald-900/10">Create User</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
