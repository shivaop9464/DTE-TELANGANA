import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  ReactNode 
} from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null; // JWT payload user
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('dte_user');
        const storedToken = localStorage.getItem('dte_token');
        if (storedUser && storedToken) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setProfile(parsed); // Profile is part of user object now
        } else if (storedUser && !storedToken) {
          // Stale session without localStorage token. Log out to refresh.
          localStorage.removeItem('dte_user');
          localStorage.removeItem('dte_token');
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Session restore failed", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setProfile(data.user as UserProfile);
    localStorage.setItem('dte_user', JSON.stringify(data.user));
    if (data.token) {
      localStorage.setItem('dte_token', data.token);
      document.cookie = `token=${data.token}; path=/; max-age=604800`;
    }
  };

  const signOut = async () => {
    const token = localStorage.getItem('dte_token');
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('dte_user');
    localStorage.removeItem('dte_token');
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload(); // Force hard reset
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
