import { 
  LayoutDashboard, 
  Users, 
  School, 
  FileBarChart, 
  Search, 
  History, 
  LogOut,
  UserCircle,
  UserCog,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['SUPER_ADMIN', 'CTE_ADMIN', 'PRINCIPAL', 'DATA_ENTRY', 'AUDITOR'] },
  { name: 'Employees', icon: Users, path: '/employees', roles: ['SUPER_ADMIN', 'CTE_ADMIN', 'PRINCIPAL', 'DATA_ENTRY', 'AUDITOR'] },
  { name: 'Institutions', icon: School, path: '/institutions', roles: ['SUPER_ADMIN', 'CTE_ADMIN'] },
  { name: 'Reports', icon: FileBarChart, path: '/reports', roles: ['SUPER_ADMIN', 'CTE_ADMIN', 'PRINCIPAL', 'AUDITOR'] },
  { name: 'Search', icon: Search, path: '/search', roles: ['SUPER_ADMIN', 'CTE_ADMIN', 'PRINCIPAL', 'DATA_ENTRY', 'AUDITOR'] },
  { name: 'Users', icon: UserCog, path: '/users', roles: ['SUPER_ADMIN', 'CTE_ADMIN'] },
  { name: 'Logs', icon: History, path: '/logs', roles: ['SUPER_ADMIN', 'CTE_ADMIN'] },
];

export interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const filteredNav = NAV_ITEMS.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <aside className={cn(
      "h-full w-64 bg-tg-dark text-white flex flex-col shadow-xl",
      className
    )}>
      <div className="p-6 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5 shrink-0">
            <img 
              src="https://www.image2url.com/r2/default/images/1779256057735-2ea64428-37cc-4a9e-a854-bf574afc7f8e.jpeg" 
              alt="TS Logo" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-tg-gold">DTE Telangana</h1>
            <p className="text-[10px] text-white/60">Employee Portal</p>
          </div>
        </div>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose}
            className="lg:hidden p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors focus:outline-none"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-tg-green text-white shadow-lg" 
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/40 group-hover:text-white")} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-4">
          <div className="w-8 h-8 rounded-full bg-tg-green flex items-center justify-center text-white font-bold text-xs">
            {profile?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">{profile?.displayName || 'User'}</p>
            <p className="text-[10px] text-white/50 truncate uppercase">{profile?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={() => {
            signOut();
            if (onClose) onClose();
          }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-300 hover:bg-red-500/10 transition-all font-medium text-sm"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
