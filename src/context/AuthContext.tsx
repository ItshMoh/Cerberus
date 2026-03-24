'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authConnect, authDisconnect, authStatus } from '@/lib/api';

interface AuthState {
  connected: boolean;
  sessionToken: string | null;
  accountId: string | null;
  network: string;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  connect: (accountId: string, privateKey: string) => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'bonzo_session_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    connected: false,
    sessionToken: null,
    accountId: null,
    network: 'testnet',
    loading: true,
  });

  const refresh = useCallback(async () => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      setState(s => ({ ...s, connected: false, sessionToken: null, accountId: null, loading: false }));
      return;
    }
    try {
      const data = await authStatus(stored);
      if (data.ok && data.connected) {
        setState({
          connected: true,
          sessionToken: stored,
          accountId: data.accountId,
          network: data.network || 'testnet',
          loading: false,
        });
      } else {
        localStorage.removeItem(SESSION_KEY);
        setState({ connected: false, sessionToken: null, accountId: null, network: 'testnet', loading: false });
      }
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  const connect = async (accountId: string, privateKey: string) => {
    try {
      const data = await authConnect(accountId, privateKey);
      if (data.ok) {
        localStorage.setItem(SESSION_KEY, data.sessionToken);
        setState({
          connected: true,
          sessionToken: data.sessionToken,
          accountId: data.accountId,
          network: data.network || 'testnet',
          loading: false,
        });
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Connection failed' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
  };

  const disconnect = async () => {
    if (state.sessionToken) {
      await authDisconnect(state.sessionToken).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
    setState({ connected: false, sessionToken: null, accountId: null, network: 'testnet', loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, connect, disconnect, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
