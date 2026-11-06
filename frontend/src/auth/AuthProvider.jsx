import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';

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
    let authSubscription;

    const restoreSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!active) return;
          setSession(nextSession);
          setUser(nextSession?.user || null);
          setError(null);
        });
        authSubscription = data.subscription;

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active) return;
        setSession(sessionData?.session || null);
        setUser(sessionData?.session?.user || null);
        setError(null);
      } catch (sessionError) {
        if (!active) return;
        setSession(null);
        setUser(null);
        setError(authError(sessionError));
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    setError(null);
    try {
      const { data, error: signUpError } = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: fullName,
            ...(phone ? { phone } : {}),
          },
        },
      });
      if (signUpError) throw signUpError;
      return data;
    } catch (signUpError) {
      const normalizedError = authError(signUpError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const { data, error: signInError } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      return data;
    } catch (signInError) {
      const normalizedError = authError(signInError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      if (signOutError) throw signOutError;
    } catch (signOutError) {
      const normalizedError = authError(signOutError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(null);
    try {
      const { data, error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      return data;
    } catch (resetError) {
      const normalizedError = authError(resetError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, []);

  const updatePassword = useCallback(async (password) => {
    setError(null);
    try {
      const { data, error: updateError } = await getSupabaseClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      return data;
    } catch (updateError) {
      const normalizedError = authError(updateError);
      setError(normalizedError);
      throw normalizedError;
    }
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
    updatePassword,
  }), [user, session, loading, error, signUp, signIn, signOut, resetPassword, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
