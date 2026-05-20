import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, User, Lock } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand Side */}
      <div className="hidden lg:flex tg-gradient flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-tg-gold/5 rounded-full -ml-48 -mb-48 blur-3xl"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-2xl">
            <img 
              src="https://www.image2url.com/r2/default/images/1779256057735-2ea64428-37cc-4a9e-a854-bf574afc7f8e.jpeg" 
              alt="TS Logo" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DTE Telangana</h1>
            <p className="text-white/60 text-sm">Govt. of Telangana</p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-5xl font-extrabold leading-tight">
            Employee Database <br />
            <span className="text-tg-gold">Management Portal</span>
          </h2>
          <p className="text-white/70 text-lg max-w-md">
            Digitalizing Polytechnic education administration with real-time data and transparency.
          </p>
        </div>

        <div className="text-sm text-white/40 font-medium relative z-10">
          © {new Date().getFullYear()} Dept. of Technical Education, Telangana.
        </div>
      </div>

      {/* Login Side */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
             <img 
               src="https://www.image2url.com/r2/default/images/1779256057735-2ea64428-37cc-4a9e-a854-bf574afc7f8e.jpeg" 
               alt="TS Logo" 
               className="w-20 h-20 mx-auto mb-4 object-contain" 
               referrerPolicy="no-referrer"
             />
             <h1 className="text-2xl font-bold">DTE Telangana</h1>
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl font-bold tracking-tight">Sign In</h3>
            <p className="text-slate-500">Access your administrative account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Username / Email</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-tg-green/20 focus:border-tg-green transition-all"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-tg-green/20 focus:border-tg-green transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-tg-green text-white rounded-2xl flex items-center justify-center gap-4 transition-all duration-300 font-bold group disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tg-dark shadow-lg shadow-emerald-900/10"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  Sign In to Portal
                  <ArrowRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-medium">Internal Access</span>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 leading-relaxed">
              Manual account creation only. Contact Super Admin for credentials. <br />
              Department of Technical Education, Telangana.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
