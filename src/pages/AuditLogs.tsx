import { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  MapPin, 
  Activity,
  Search
} from 'lucide-react';
import { AuditLog } from '../types';
import { formatDate } from '../lib/utils';

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('dte_token');
      const res = await fetch('/api/logs', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Security Logs</h1>
          <p className="text-slate-500 mt-1">Audit trail of all administrative actions and system events.</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 text-sm font-bold flex items-center gap-2">
           <Shield className="w-4 h-4" />
           Live Monitoring Active
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by action or user..." 
                className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tg-green/20"
              />
           </div>
           <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 Create
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                 Update
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                 Delete
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-48">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No logs found</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(log.timestamp)}
                       </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 text-sm">{log.userEmail}</td>
                    <td className="px-6 py-4">
                       <span className={
                         "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider " +
                         (log.action.startsWith('CREATE') ? "bg-emerald-100 text-emerald-700" : 
                          log.action.startsWith('UPDATE') || log.action.startsWith('APPROVE') ? "bg-blue-100 text-blue-700" : 
                          "bg-slate-100 text-slate-700")
                       }>
                          {log.action.replace('_', ' ')}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 italic">"{log.details}"</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
