import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  accessCode: string | null;
  login: (code: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_CODE = 'lolamlol';
const STORAGE_KEY = 'klaaro_access';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize from localStorage immediately
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return data.code && data.code.toLowerCase() === VALID_CODE;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [accessCode, setAccessCode] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.code && data.code.toLowerCase() === VALID_CODE) {
          return data.code;
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    // Re-check localStorage on mount and periodically to prevent loss
    const checkAuth = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.code && data.code.toLowerCase() === VALID_CODE) {
            if (!isAuthenticated) {
              setIsAuthenticated(true);
              setAccessCode(data.code);
            }
          }
        } catch {
          // Keep current state if parse fails
        }
      }
    };

    checkAuth();
    
    // Check every 5 seconds to ensure auth persists
    const interval = setInterval(checkAuth, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = (code: string): boolean => {
    if (code.toLowerCase() === VALID_CODE) {
      const authData = { 
        code, 
        timestamp: new Date().toISOString(),
        persistent: true
      };
      setIsAuthenticated(true);
      setAccessCode(code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      
      // Also set a backup flag
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAccessCode(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, accessCode, login, logout }}>
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
