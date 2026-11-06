import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../auth/useAuth';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading" role="status">Checking your sign-in...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
