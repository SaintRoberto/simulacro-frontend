import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const PrivateRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};
