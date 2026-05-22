import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Users, 
  School, 
  UserPlus, 
  AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (profile?.role === 'EMPLOYEE') {
    return <Navigate to="/employees" replace />;
  }
  const [stats, setStats] = useState({
    employees: 0,
    institutions: 0,
    newApprovals: 0,
    vacancies: 0
  });
  const [recentApprovals, setRecentApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('dte_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const empRes = await fetch('/api/employees', { headers });
        const instRes = await fetch('/api/institutions', { headers });

        let allEmployees = await empRes.json();
        let allInstitutions = await instRes.json();

        if (!Array.isArray(allEmployees)) allEmployees = [];
        if (!Array.isArray(allInstitutions)) allInstitutions = [];

        // Role-based filtering
        if (profile && (profile.role === 'PRINCIPAL' || profile.role === 'DATA_ENTRY') && profile.institutionId) {
          allEmployees = allEmployees.filter((e: any) => e.institutionId === profile.institutionId);
          allInstitutions = allInstitutions.filter((i: any) => i.id === profile.institutionId);
        }

        let vacCount = 0;
        allInstitutions.forEach((inst: any) => {
          vacCount += (inst.vacancies || 0);
        });

        setStats({
          employees: allEmployees.length,
          institutions: allInstitutions.length,
          newApprovals: allEmployees.filter((e: any) => e.status === 'PENDING').length,
          vacancies: vacCount
        });

        setRecentApprovals(allEmployees.slice(0, 5));
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [profile]);

  const STATS_CARDS = [
    { label: 'Total Employees', value: stats.employees.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', path: '/employees' },
    { label: 'Institutions', value: stats.institutions.toLocaleString(), icon: School, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/institutions' },
    { label: 'New Approvals', value: stats.newApprovals.toLocaleString(), icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50', path: '/employees' },
    { label: 'Vacancies', value: stats.vacancies.toLocaleString(), icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', path: '/institutions' },
  ];

  const QUALIFICATION_DATA = [
    { name: 'PhD', value: 145 },
    { name: 'M.Tech', value: 720 },
    { name: 'B.Tech', value: 380 },
    { name: 'Diploma', value: 237 },
  ];

  const DISTRICT_DATA = [
    { name: 'Hyderabad', count: 420 },
    { name: 'Rangareddy', count: 310 },
    { name: 'Warangal', count: 280 },
    { name: 'Nizamabad', count: 150 },
    { name: 'Khammam', count: 180 },
    { name: 'Karimnagar', count: 142 },
  ];

  const COLORS = ['#008444', '#FFD700', '#004d26', '#f0fdf4', '#1a1a1a'];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Internal Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-tg-green">{profile?.displayName}</span>. 
            Here's what's happening across DTE Telangana today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 shadow-sm">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS_CARDS.map((stat) => (
          <div 
            key={stat.label} 
            onClick={() => navigate(stat.path)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-tg-green hover:shadow-lg cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              {loading ? (
                <div className="h-10 w-10 bg-slate-100 animate-pulse rounded-xl"></div>
              ) : (
                <div className={stat.bg + " p-3 rounded-xl " + stat.color}>
                  <stat.icon className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
              {loading ? (
                <div className="h-8 w-20 bg-slate-100 animate-pulse rounded"></div>
              ) : (
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-tg-green transition-colors">{stat.value}</h3>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Qualification Distribution */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg text-slate-900">Staff Qualifications</h3>
            <span className="text-xs font-bold text-tg-green bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">Academic</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={QUALIFICATION_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {QUALIFICATION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* District-wise distribution */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg text-slate-900">District Enrollment</h3>
            <span className="text-xs font-bold text-tg-green bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">Geographic</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DISTRICT_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                />
                <Tooltip 
                   cursor={{ fill: '#F1F5F9' }}
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#008444" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity / Approvals */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">Recent Employee Approvals</h3>
          <button className="text-sm font-bold text-tg-green hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Institution</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentApprovals.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{emp.name}</td>
                  <td className="px-6 py-4 text-slate-600">{emp.designation}</td>
                  <td className="px-6 py-4 text-slate-600">{emp.institutionId}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${emp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => navigate('/employees')}
                      className="text-sm font-bold text-tg-green bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {recentApprovals.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No recent activity</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
