import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  accessCode: string | null;
  login: (code: string) => boolean;
  logout: () => void;
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
  // Use ref to track if we've initialized from storage
  const initializedRef = useRef(false);
  
  // Initialize state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkAuthFromStorage());
  const [accessCode, setAccessCode] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.code && data.code.toLowerCase() === VALID_CODE) {
          return data.code;
        }
      }
    } catch {
      return null;
    }
    return null;
  });

  // Sync with localStorage on mount and when storage changes
  useEffect(() => {
    // Only run once on mount
    if (!initializedRef.current) {
      const isAuth = checkAuthFromStorage();
      if (isAuth !== isAuthenticated) {
        setIsAuthenticated(isAuth);
      }
      initializedRef.current = true;
    }

    // Listen for storage events (sync across tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const isAuth = checkAuthFromStorage();
        setIsAuthenticated(isAuth);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated]);

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
