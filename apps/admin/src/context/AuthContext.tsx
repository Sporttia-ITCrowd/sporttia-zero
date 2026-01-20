import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, type User, ApiError } from '../lib/api';

// Auth state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth context value
interface AuthContextValue extends AuthState {
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create context
const AuthContext = createContext<AuthContextValue | null>(null);

// Storage keys
const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      // Check for invalid token (missing, empty, or literal "undefined" string)
      if (!token || !storedUser || token === 'undefined' || token === 'null') {
        // Clear any invalid stored values
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        // Verify token is still valid by calling /me
        const response = await api.getCurrentUser();

        setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Update stored user in case it changed
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = useCallback(async (loginValue: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.login(loginValue, password);

      // Validate response has required fields
      if (!response.token) {
        throw new Error('Login response missing token');
      }
      if (!response.user) {
        throw new Error('Login response missing user data');
      }

      // Store token and user
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'An unexpected error occurred. Please try again.';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));

      return false;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }

    // Clear storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
