import { ReactNode, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-tg-green border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Top Header Bar */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-tg-dark text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 shrink-0">
            <img 
              src="https://www.image2url.com/r2/default/images/1779256057735-2ea64428-37cc-4a9e-a854-bf574afc7f8e.jpeg" 
              alt="TS Logo" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-bold text-xs leading-none text-tg-gold">DTE Telangana</h1>
            <p className="text-[9px] text-white/60">Employee Portal</p>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors focus:outline-none"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Side Bar navigation panel */}
      <Sidebar 
        className={`fixed inset-y-0 left-0 z-50 transform lg:translate-x-0 transition-transform duration-300 ease-in-out lg:static shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
