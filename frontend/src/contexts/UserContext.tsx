import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authAPI, getToken, removeToken } from '@/lib/api';
import { mapBackendRoleToFrontend } from '@/lib/roleMapper';

export type UserRole =
  | 'admin'
  | 'areaManager'
  | 'branchManager'
  | 'supervisor'
  | 'staff';

interface UserContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentBranch: string;
  setCurrentBranch: (branch: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  user: any;
  setUser: (user: any) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  loadUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('staff');
  const [currentBranch, setCurrentBranch] = useState('');
  const [userName, setUserName] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.getMe();

      if (response.success && response.data) {
        setUser(response.data);
        // Map backend role to frontend role
        const frontendRole = mapBackendRoleToFrontend(response.data.role);
        setRole(frontendRole);
        setUserName(response.data.name);
        if (response.data.branch_code) {
          setCurrentBranch(response.data.branch_code);
        } else if (response.data.branchId?.name) {
          setCurrentBranch(response.data.branchId.name);
        }
        setIsAuthenticated(true);
      } else {
        removeToken();
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error: any) {
      // Don't remove token on network errors - might be temporary
      if (!error.message?.includes('NetworkError') && !error.message?.includes('Failed to fetch')) {
        removeToken();
      }
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = () => {
    removeToken();
    setUser(null);
    setRole('staff');
    setUserName('');
    setCurrentBranch('');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <UserContext.Provider value={{
      role,
      setRole,
      currentBranch,
      setCurrentBranch,
      userName,
      setUserName,
      user,
      setUser,
      isAuthenticated,
      isLoading,
      logout,
      loadUser,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

