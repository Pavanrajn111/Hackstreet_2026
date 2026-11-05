import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabaseClient';

export const AuthContext = createContext(null);

const authError = (error) => {
  if (!error) return null;
  return error instanceof Error ? error : new Error(error.message || 'Authentication failed.');
};

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) setError(authError(sessionError));
      setSession(data?.session || null);
      setUser(data?.session?.user || null);
      setLoading(false);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setError(null);
      setLoading(false);
    });

    restoreSession();

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(phone ? { phone } : {}),
        },
      },
    });
    if (signUpError) {
      const normalizedError = authError(signUpError);
      setError(normalizedError);
      throw normalizedError;
    }
    return data;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      const normalizedError = authError(signInError);
      setError(normalizedError);
      throw normalizedError;
    }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      const normalizedError = authError(signOutError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(null);
    const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recover`,
    });
    if (resetError) {
      const normalizedError = authError(resetError);
      setError(normalizedError);
      throw normalizedError;
    }
    return data;
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }), [user, session, loading, error, signUp, signIn, signOut, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
