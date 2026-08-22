import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState(initialTab); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setShowPassword(false);
      setAgreeTerms(true);
    }
  }, [isOpen, initialTab]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    const tid = toast.loading('Signing in with Google...');
    try {
      await loginWithGoogle();
      toast.success('Signed in successfully!', { id: tid });
      onClose();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.', { id: tid });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    if (tab === 'forgot') {
      setLoading(true);
      const tid = toast.loading('Sending password reset email...');
      try {
        await resetPassword(email.trim());
        toast.success('Password reset link sent! Check your inbox.', { id: tid });
        setTab('login');
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          toast.error('No account found with this email.', { id: tid });
        } else {
          toast.error(err.message || 'Failed to send reset link.', { id: tid });
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      toast.error('Please enter your password.');
      return;
    }

    if (tab === 'register') {
      if (!displayName.trim()) {
        toast.error('Please enter a username.');
        return;
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long.');
        return;
      }
      if (!agreeTerms) {
        toast.error('Please agree to the Terms and Conditions.');
        return;
      }

      setLoading(true);
      const tid = toast.loading('Creating your account...');
      try {
        await registerWithEmail(email.trim(), password, displayName.trim());
        toast.success('Account created! Welcome to TaskMint.', { id: tid });
        onClose();
        navigate('/dashboard');
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          toast.error('Email is already registered. Please login.', { id: tid });
        } else if (err.code === 'auth/weak-password') {
          toast.error('Password is too weak.', { id: tid });
        } else {
          toast.error(err.message || 'Registration failed.', { id: tid });
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Login
      setLoading(true);
      const tid = toast.loading('Logging in...');
      try {
        await loginWithEmail(email.trim(), password);
        toast.success('Welcome back!', { id: tid });
        onClose();
        navigate('/dashboard');
      } catch (err) {
        if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential'].includes(err.code)) {
          toast.error('Invalid email or password.', { id: tid });
        } else {
          toast.error(err.message || 'Login failed.', { id: tid });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(38px)',
        WebkitBackdropFilter: 'blur(38px)',
      }}
      onClick={onClose}
    >
      {/* Centering & Scrollable Inner Container */}
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative bg-white rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden flex flex-col justify-between w-full my-auto"
          style={{
            maxWidth: '626px',
            width: '100%',
            padding: '10px 10px 28px 10px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Card (606px x 176px) */}
          <div
            className="relative rounded-[24px] overflow-hidden flex flex-col justify-center w-full"
            style={{
              maxWidth: '606px',
              height: '176px',
              background: 'rgba(250, 247, 240, 1)',
              padding: '24px 32px',
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity z-30 cursor-pointer shadow-sm p-0"
              style={{
                width: '22px',
                height: '22px',
                top: '8px',
                right: '8px',
              }}
              aria-label="Close popup"
            >
              <FiX style={{ width: '12px', height: '12px', strokeWidth: 2.5 }} />
            </button>

            {/* Right Side Decoration Image from Figma */}
            <img
              src="/coins/logside.png"
              alt="Decoration"
              className="absolute top-0 right-0 h-full w-auto object-contain pointer-events-none z-10"
              style={{
                maxHeight: '176px',
              }}
            />

            {/* Header Content */}
            <div className="relative z-20 text-left flex flex-col" style={{ maxWidth: '100%' }}>
              <div className="flex flex-col" style={{ height: 56, gap: 20 }}>
                <h2
                  className="m-0 flex items-center whitespace-nowrap"
                  style={{
                    height: 23,
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '35px',
                    lineHeight: '60px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                  }}
                >
                  {tab === 'login' && 'Login Your Account'}
                  {tab === 'register' && 'Create Your Account'}
                  {tab === 'forgot' && 'Forgot Password'}
                </h2>

                <p
                  className="m-0 flex items-center whitespace-nowrap"
                  style={{
                    height: 13,
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: tab === 'forgot' ? '15px' : '16px',
                    lineHeight: '26px',
                    letterSpacing: '0%',
                    color: 'rgba(14, 15, 12, 1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab === 'login' && 'Login into your account to access all features'}
                  {tab === 'register' && 'Create your account to access all features'}
                  {tab === 'forgot' && 'Enter your registered email to get verification code'}
                </p>
              </div>

              {/* Line below them */}
              <div
                style={{
                  width: '74px',
                  height: '4px',
                  borderRadius: '20px',
                  background: 'rgba(85, 88, 211, 1)',
                  marginTop: '16px',
                }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className="w-full flex flex-col items-center pt-7 sm:pt-9 px-4 sm:px-0">
            <form onSubmit={handleSubmit} className="flex flex-col w-full items-center" style={{ maxWidth: '567px' }}>
              {/* Form Controls Group (567px x 288px, gap: 20px) */}
              <div
                className="flex flex-col w-full justify-between"
                style={{
                  maxWidth: '567px',
                  minHeight: tab === 'login' ? '288px' : 'auto',
                  gap: '20px',
                }}
              >
                {tab === 'register' && (
                  <div className="flex flex-col text-left w-full" style={{ maxWidth: '567px', height: '82px', gap: '13px' }}>
                    <label
                      className="flex items-center"
                      style={{
                        maxWidth: '567px',
                        height: '11px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '26px',
                        letterSpacing: '0%',
                        color: 'rgba(0, 0, 0, 1)',
                      }}
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your Username"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                      className="w-full text-[15px] outline-none border border-transparent focus:border-gray-400 transition-colors placeholder:text-black/50 text-black"
                      style={{
                        maxWidth: '567px',
                        height: '58px',
                        borderRadius: '50px',
                        paddingLeft: '24px',
                        paddingRight: '24px',
                        background: 'rgba(239, 239, 239, 1)',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 400,
                        fontSize: '15px',
                        lineHeight: '26px',
                        letterSpacing: '0%',
                        color: 'rgba(0, 0, 0, 1)',
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-col text-left w-full" style={{ maxWidth: '567px', height: '82px', gap: '13px' }}>
                  <label
                    className="flex items-center"
                    style={{
                      maxWidth: '567px',
                      height: '11px',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '26px',
                      letterSpacing: '0%',
                      color: 'rgba(0, 0, 0, 1)',
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full text-[15px] outline-none border border-transparent focus:border-gray-400 transition-colors placeholder:text-black/50 text-black"
                    style={{
                      maxWidth: '567px',
                      height: '58px',
                      borderRadius: '50px',
                      paddingLeft: '24px',
                      paddingRight: '24px',
                      background: 'rgba(239, 239, 239, 1)',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 400,
                      fontSize: '15px',
                      lineHeight: '26px',
                      letterSpacing: '0%',
                      color: 'rgba(0, 0, 0, 1)',
                    }}
                  />
                </div>

                {tab !== 'forgot' && (
                  <div className="flex flex-col text-left w-full" style={{ maxWidth: '567px', height: '82px', gap: '13px' }}>
                    <label
                      className="flex items-center"
                      style={{
                        maxWidth: '567px',
                        height: '11px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '26px',
                        letterSpacing: '0%',
                        color: 'rgba(0, 0, 0, 1)',
                      }}
                    >
                      Password
                    </label>
                    <div className="relative flex items-center w-full" style={{ maxWidth: '567px', height: '58px' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="w-full text-[15px] outline-none border border-transparent focus:border-gray-400 transition-colors placeholder:text-black/50 text-black"
                        style={{
                          maxWidth: '567px',
                          height: '58px',
                          borderRadius: '50px',
                          paddingLeft: '24px',
                          paddingRight: '48px',
                          background: 'rgba(239, 239, 239, 1)',
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: '15px',
                          lineHeight: '26px',
                          letterSpacing: '0%',
                          color: 'rgba(0, 0, 0, 1)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 text-gray-500 hover:text-black transition-colors"
                      >
                        {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remember Me & Forgot Password Row */}
                {tab === 'login' && (
                  <div className="flex items-center justify-between px-1 w-full" style={{ maxWidth: '567px' }}>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="cursor-pointer accent-[#24324D]"
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '5px',
                          border: '1px solid rgba(36, 50, 77, 1)',
                        }}
                      />
                      <span
                        className="flex items-center"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: '15px',
                          lineHeight: '26px',
                          letterSpacing: '0%',
                          color: 'rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        Remember me
                      </span>
                    </label>
                    <div
                      className="flex items-center"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 400,
                        fontSize: '15px',
                        lineHeight: '26px',
                        letterSpacing: '0%',
                      }}
                    >
                      <span style={{ color: 'rgba(0, 0, 0, 0.5)' }}>
                        Don't Remember Your Password?&nbsp;
                      </span>
                      <button
                        type="button"
                        onClick={() => setTab('forgot')}
                        className="cursor-pointer hover:underline p-0"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 600,
                          fontSize: '15px',
                          lineHeight: '26px',
                          color: 'rgba(36, 50, 77, 1)',
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                {/* Terms Agreement Checkbox for Register */}
                {tab === 'register' && (
                  <div className="flex items-center gap-2 px-1 w-full" style={{ maxWidth: '567px' }}>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="cursor-pointer accent-[#24324D] flex-shrink-0"
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '5px',
                          border: '1px solid rgba(36, 50, 77, 1)',
                        }}
                      />
                      <span
                        className="flex items-center whitespace-nowrap"
                        style={{
                          maxWidth: '544px',
                          whiteSpace: 'nowrap',
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: '14.5px',
                          lineHeight: '26px',
                          letterSpacing: '-0.01em',
                          color: 'rgba(0, 0, 0, 0.6)',
                          opacity: 1,
                        }}
                      >
                        By signing up, you agree to our&nbsp;
                        <span style={{ fontWeight: 600, color: 'rgba(36, 50, 77, 1)' }}>
                          Terms and Conditions
                        </span>
                        &nbsp;&&nbsp;
                        <span style={{ fontWeight: 600, color: 'rgba(36, 50, 77, 1)' }}>
                          Privacy Policy.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center transition-all hover:bg-[#1A253A] active:scale-[0.99] disabled:opacity-70 cursor-pointer shadow-sm mt-auto"
                  style={{
                    maxWidth: '567px',
                    height: '49px',
                    gap: '10px',
                    borderRadius: '80px',
                    padding: '19px 28px',
                    backgroundColor: 'rgba(36, 50, 77, 1)',
                  }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span
                      className="flex items-center justify-center"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '28px',
                        letterSpacing: '0%',
                        color: 'rgba(255, 255, 255, 1)',
                      }}
                    >
                      {tab === 'login' ? 'Login' : tab === 'register' ? 'Sign Up' : 'Send Reset Link'}
                    </span>
                  )}
                </button>
              </div>

              {/* Below Section */}
              <div className="w-full flex flex-col gap-4 mt-5" style={{ maxWidth: '567px' }}>
                {/* Divider */}
                {tab !== 'forgot' && (
                  <div className="flex items-center justify-between w-full my-0.5" style={{ maxWidth: '567px' }}>
                    <div
                      style={{
                        width: '267px',
                        maxWidth: 'calc(50% - 15px)',
                        height: '0px',
                        borderTop: '1px solid rgba(0, 0, 0, 1)',
                        opacity: 0.1,
                      }}
                    />
                    <span
                      className="flex items-center justify-center text-center"
                      style={{
                        width: '21px',
                        height: '10px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 400,
                        fontSize: '15px',
                        lineHeight: '26px',
                        letterSpacing: '0%',
                        color: 'rgba(36, 50, 77, 1)',
                      }}
                    >
                      OR
                    </span>
                    <div
                      style={{
                        width: '267px',
                        maxWidth: 'calc(50% - 15px)',
                        height: '0px',
                        borderTop: '1px solid rgba(0, 0, 0, 1)',
                        opacity: 0.1,
                      }}
                    />
                  </div>
                )}

                {/* Google Sign In */}
                {tab !== 'forgot' && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full rounded-full text-[#0E0F0C] font-medium text-[15px] flex items-center justify-center gap-3 bg-[#EFEFEF] hover:bg-[#E5E5E5] transition-all cursor-pointer shadow-sm"
                    style={{
                      height: '52px',
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    <FcGoogle style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }} />
                    <span>{tab === 'login' ? 'Login with Google' : 'Sign up with Google'}</span>
                  </button>
                )}

                {/* Bottom Switcher Links */}
                <div className="text-center text-[13px] text-[#52525B]" style={{ fontFamily: '"Poppins", sans-serif' }}>
                  {tab === 'login' && (
                    <p className="m-0">
                      Don't Have an Account?{' '}
                      <button
                        type="button"
                        onClick={() => setTab('register')}
                        className="font-bold text-[#24324D] hover:underline cursor-pointer"
                      >
                        Register Now
                      </button>
                    </p>
                  )}

                  {tab === 'register' && (
                    <p className="m-0">
                      Already Have an Account?{' '}
                      <button
                        type="button"
                        onClick={() => setTab('login')}
                        className="font-bold text-[#24324D] hover:underline cursor-pointer"
                      >
                        Login
                      </button>
                    </p>
                  )}

                  {tab === 'forgot' && (
                    <p className="m-0" style={{ fontFamily: '"Poppins", sans-serif', fontSize: '15px' }}>
                      <span style={{ color: 'rgba(0, 0, 0, 0.5)' }}>Back to login </span>
                      <button
                        type="button"
                        onClick={() => setTab('login')}
                        className="font-semibold text-[#24324D] hover:underline cursor-pointer"
                        style={{ fontFamily: '"Poppins", sans-serif' }}
                      >
                        Login Now
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
