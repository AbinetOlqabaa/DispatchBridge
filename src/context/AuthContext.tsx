import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types/dispatch.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  verifyPhone: (code: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  quickLoginDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(api.getCurrentUser());
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (api.getToken()) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch {
          // Token invalid or server rebooted
          api.clearSession();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
    setToken(res.token);
  };

  const register = async (payload: any) => {
    const res = await api.register(payload);
    setUser(res.user);
    setToken(res.token);
  };

  const logout = () => {
    api.clearSession();
    setUser(null);
    setToken(null);
  };

  const verifyPhone = async (code: string) => {
    await api.verifyPhone(code);
    if (user) {
      setUser({ ...user, phoneVerified: true });
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch {
      // Ignored
    }
  };

  const quickLoginDemoRole = async (role: UserRole) => {
    const roleCreds: Record<UserRole, { email: string }> = {
      BUSINESS_OWNER: { email: 'owner@apexsupply.com' },
      SENDER: { email: 'dispatcher@apexsupply.com' },
      RECEIVER: { email: 'store@metroretail.com' },
      SUPER_ADMIN: { email: 'admin@dispatchbridge.internal' },
    };

    const target = roleCreds[role];
    if (target) {
      await login(target.email, 'Password123!');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        verifyPhone,
        refreshProfile,
        quickLoginDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
