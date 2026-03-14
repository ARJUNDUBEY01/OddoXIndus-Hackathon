import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMail, FiArrowLeft, FiLock, FiCheckCircle, FiShield, FiClock } from 'react-icons/fi';

const OTP_API = 'http://localhost:5000/api/auth';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);
  const navigate = useNavigate();

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    setCanResend(false);
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ---- STEP 1: Send OTP ----
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${OTP_API}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('OTP sent to your email!');
      setCountdown(data.expiresIn || 300);
      setStep(2);
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ---- OTP Input Handlers ----
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  // ---- STEP 2: Verify OTP ----
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${OTP_API}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVerificationToken(data.verification_token);
      toast.success('OTP Verified!');
      setStep(3);
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ---- Resend OTP ----
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await fetch(`${OTP_API}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOtp(['', '', '', '', '', '']);
      setCountdown(data.expiresIn || 300);
      toast.success('New OTP sent!');
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // ---- STEP 3: Reset Password ----
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${OTP_API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPassword, verification_token: verificationToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[20%] w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md p-8 relative z-10 glass-panel">
        <Link to="/login" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <FiArrowLeft className="mr-2" /> Back to Login
        </Link>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                step > s
                  ? 'bg-green-500 border-green-500 text-white'
                  : step === s
                  ? 'bg-accent border-accent text-white shadow-lg shadow-accent/30'
                  : 'border-slate-600 text-slate-500'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-10 h-0.5 transition-all duration-300 ${step > s ? 'bg-green-500' : 'bg-slate-700'}`}></div>
              )}
            </div>
          ))}
        </div>

        {/* ─── STEP 1: Enter Email ─── */}
        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-white">Reset Password</h1>
              <p className="text-slate-400 mt-2 text-sm">Enter your email to receive a 6-digit verification code.</p>
            </div>
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-slate-400" />
                  </div>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-accent outline-none placeholder-slate-500 text-white"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-accent hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-accent/20 flex items-center justify-center disabled:opacity-50">
                {loading ? <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span> : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {/* ─── STEP 2: Enter OTP ─── */}
        {step === 2 && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-white">Verify OTP</h1>
              <p className="text-slate-400 mt-2 text-sm">
                Enter the 6-digit code sent to <strong className="text-white">{email}</strong>
              </p>
            </div>

            {/* Countdown Timer */}
            <div className={`flex items-center justify-center gap-2 mb-6 p-3 rounded-lg border text-sm ${
              countdown > 60
                ? 'bg-green-500/5 border-green-500/20 text-green-400'
                : countdown > 0
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                : 'bg-red-500/5 border-red-500/20 text-red-400'
            }`}>
              <FiClock className="w-4 h-4" />
              {countdown > 0 ? (
                <span>Code expires in <strong>{formatTime(countdown)}</strong></span>
              ) : (
                <span>OTP has expired. Please resend.</span>
              )}
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 6 Separate OTP Input Boxes */}
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 outline-none transition-all duration-200 bg-slate-800/50 text-white ${
                      digit
                        ? 'border-accent shadow-lg shadow-accent/10'
                        : 'border-slate-700/50 focus:border-accent'
                    }`}
                  />
                ))}
              </div>

              <button type="submit" disabled={loading || otp.join('').length !== 6}
                className="w-full py-3 bg-accent hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-accent/20 disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  className={`text-sm font-medium transition-colors ${
                    canResend ? 'text-accent hover:text-blue-400 cursor-pointer' : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {canResend ? 'Resend OTP' : `Resend available in ${formatTime(countdown)}`}
                </button>
              </div>

              <button type="button" onClick={() => { setStep(1); setOtp(['','','','','','']); }}
                className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors">
                ← Change email
              </button>
            </form>
          </>
        )}

        {/* ─── STEP 3: Set New Password ─── */}
        {step === 3 && (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <FiShield className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">New Password</h1>
                  <p className="text-green-400 text-xs font-medium">Identity verified ✓</p>
                </div>
              </div>
              <p className="text-slate-400 mt-3 text-sm">Choose a strong new password for your account.</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-slate-400" />
                  </div>
                  <input type="password" required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white outline-none focus:ring-2 focus:ring-accent"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-slate-400" />
                  </div>
                  <input type="password" required value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white outline-none focus:ring-2 focus:ring-accent"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">
                {loading ? 'Updating...' : 'Set Password & Login'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
