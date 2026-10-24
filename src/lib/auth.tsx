import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, setAuthToken, setUnauthorizedHandler } from '@/lib/api';
import { registerForPush, unregisterPush } from '@/lib/push';
import type { TokenResponse, User } from '@/types';

const TOKEN_KEY = 'esupadom.accessToken';

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  // Restaure la session au démarrage (jeton valable 30 jours, comme une session du site).
  useEffect(() => {
    setUnauthorizedHandler(() => void clearSession());
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setAuthToken(saved);
          setUser(await api.me());
          setToken(saved);
          void registerForPush();
        }
      } catch {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const startSession = useCallback(async (res: TokenResponse) => {
    setAuthToken(res.accessToken);
    await SecureStore.setItemAsync(TOKEN_KEY, res.accessToken);
    setUser(res.user);
    setToken(res.accessToken);
    void registerForPush();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => startSession(await api.login(email, password)),
    [startSession],
  );
  const signInWithGoogle = useCallback(
    async (idToken: string) => startSession(await api.loginWithGoogle(idToken)),
    [startSession],
  );

  const signOut = useCallback(async () => {
    await unregisterPush().catch(() => undefined);
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signInWithGoogle, signOut }),
    [user, token, isLoading, signIn, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
