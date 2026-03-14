import React from 'react';
import { Navigate } from 'react-router-dom';

// Password reset is now handled entirely in ForgotPassword.jsx (3-step OTP flow)
// This route redirects to /forgot-password for backwards compatibility
export default function ResetPassword() {
  return <Navigate to="/forgot-password" replace />;
}
