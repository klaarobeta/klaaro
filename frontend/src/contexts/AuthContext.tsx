import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  accessCode: string | null;
  login: (code: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_CODE = 'lolamlol';
const STORAGE_KEY = 'klaaro_access';

// Helper function to check auth from localStorage
const checkAuthFromStorage = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.code && data.code.toLowerCase() === VALID_CODE;
    }
  } catch {
    return false;
  }
  return false;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Start with loading state to prevent premature redirects
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.code && data.code.toLowerCase() === VALID_CODE) {
          setIsAuthenticated(true);
          setAccessCode(data.code);
        }
      }
    } catch {
      // Keep defaults if parsing fails
    } finally {
      // Mark as initialized
      setIsLoading(false);
    }
  }, []);

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const isAuth = checkAuthFromStorage();
        setIsAuthenticated(isAuth);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (code: string): boolean => {
    if (code.toLowerCase() === VALID_CODE) {
      const authData = { 
        code, 
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      setIsAuthenticated(true);
      setAccessCode(code);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setAccessCode(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, accessCode, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
