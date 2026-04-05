import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { clearApiCache, getStoredToken, parseStoredJson } from '../utils/api';

const AuthContext = createContext();
const THEME_KEY = 'moviex.theme';

const applyTheme = (isDarkMode) => {
  const theme = isDarkMode ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parsedUser = parseStoredJson(localStorage.getItem('user'), null);
    if (parsedUser && typeof parsedUser === 'object') {
      setUser(parsedUser);
      if (typeof parsedUser.darkMode === 'boolean') {
        applyTheme(parsedUser.darkMode);
      }
    } else {
      localStorage.removeItem('user');
      setUser(null);
    }

    if (!document.documentElement.getAttribute('data-theme')) {
      const persistedTheme = localStorage.getItem(THEME_KEY) || 'dark';
      document.documentElement.setAttribute('data-theme', persistedTheme);
    }

    setLoading(false);
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (typeof userData.darkMode === 'boolean') {
      applyTheme(userData.darkMode);
    }
  }, []);

  const logout = useCallback(() => {
    axios.post('/api/auth/logout').catch(() => {});
    setUser(null);
    localStorage.removeItem('user');
    clearApiCache();
  }, []);

  const updateSubscription = useCallback((plan) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const updatedUser = { ...currentUser, subscriptionPlan: plan };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const syncPaymentEntitlements = useCallback((entitlements) => {
    setUser((currentUser) => {
      if (!currentUser || !entitlements) return currentUser;
      const updatedUser = {
        ...currentUser,
        subscriptionPlan: entitlements.subscriptionPlan || currentUser.subscriptionPlan,
        unlockedMovieIds: Array.isArray(entitlements.unlockedMovieIds)
          ? entitlements.unlockedMovieIds
          : currentUser.unlockedMovieIds || [],
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const getToken = useCallback(() => {
    if (user?.token) return user.token;
    return getStoredToken();
  }, [user]);
  
  const checkRole = useCallback((role) => {
      return user && user.roles && user.roles.includes(role);
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    updateSubscription,
    syncPaymentEntitlements,
    getToken,
    checkRole,
    loading,
  }), [user, login, logout, updateSubscription, syncPaymentEntitlements, getToken, checkRole, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
