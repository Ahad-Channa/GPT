import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiUser, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

/* ─── Left-panel decorative SVG waves ──────────────────────── */
const WaveDecor = () => (
  <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="wA" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="wB" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="120" cy="120" rx="250" ry="250" fill="url(#wA)" />
    <ellipse cx="380" cy="380" rx="220" ry="220" fill="url(#wB)" />
    {/* Wave lines */}
    {[0, 30, 60, 90, 120, 150].map((offset, i) => (
      <path key={i}
        d={`M -50 ${160 + offset} Q 125 ${120 + offset} 250 ${160 + offset} Q 375 ${200 + offset} 550 ${160 + offset}`}
        stroke="white" strokeWidth="1" fill="none" strokeOpacity="0.12"
      />
    ))}
  </svg>
);

/* ─── Floating dots ─────────────────────────────────────────── */
const Dot = ({ style, color, size = 8 }) => (
  <div className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, background: color, filter: 'blur(0.5px)', ...style }} />
);

/* ─── Input Field Component ─────────────────────────────────── */
const Field = ({ label, name, type, placeholder, icon: Icon, formik, loading, extra }) => {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  const hasErr = formik.touched[name] && formik.errors[name];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
          {label}
        </label>
        {extra}
      </div>
      <div className="relative">
        <Icon
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: hasErr ? '#f87171' : 'rgba(255,255,255,0.25)' }}
        />
        <input
          type={isPass && show ? 'text' : type}
          name={name}
          placeholder={placeholder}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          disabled={loading}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${hasErr ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
            padding: '0.7rem 2.5rem 0.7rem 2.6rem',
            color: 'white',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'rgba(37,99,235,0.55)';
            e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
          }}
          onBlurCapture={e => {
            if (!hasErr) {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.boxShadow = 'none';
            }
          }}
        />
        {isPass && (
          <button type="button" tabIndex={-1}
            onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {show ? <FiEyeOff size={14} /> : <FiEye size={14} />}
          </button>
        )}
      </div>
      {hasErr && <p style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '5px' }}>{formik.errors[name]}</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Login / Register Page
═══════════════════════════════════════════════════════════ */
const Login = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'register') {
      setIsRegistering(true);
    }
  }, [location]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google!');
      navigate('/');
    } catch {
      toast.error('Google sign-in failed.');
    }
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    ...(!isForgotPassword && {
      password: Yup.string().min(8, 'At least 8 characters').required('Password is required')
    }),
    ...(isRegistering && !isForgotPassword && {
      displayName: Yup.string()
        .min(3, 'At least 3 characters').max(20, 'Max 20 characters')
        .matches(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, dashes & underscores only')
        .required('Username is required'),
    }),
  });

  const formik = useFormik({
    initialValues: { displayName: '', email: '', password: '' },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: async (values, { setFieldError }) => {
      setLoading(true);
      if (isForgotPassword) {
        const tid = toast.loading('Sending reset link...');
        try {
          await resetPassword(values.email);
          toast.success('Password reset link sent to your email!', { id: tid });
          setIsForgotPassword(false);
          formik.resetForm();
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            toast.error('No account found with this email.', { id: tid });
            setFieldError('email', 'Email not found');
          } else {
            toast.error(error.message || 'Something went wrong.', { id: tid });
          }
        }
        setLoading(false);
        return;
      }

      const tid = toast.loading(isRegistering ? 'Creating account...' : 'Signing in...');
      try {
        if (isRegistering) {
          await registerWithEmail(values.email, values.password, values.displayName);
          toast.success('Account created! Please verify your email.', { id: tid });
        } else {
          await loginWithEmail(values.email, values.password);
          toast.success('Welcome back!', { id: tid });
          navigate('/');
        }
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          toast.error('Email already registered.', { id: tid });
          setFieldError('email', 'Email already in use');
        } else if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential'].includes(error.code)) {
          toast.error('Invalid credentials.', { id: tid });
        } else if (error.code === 'auth/weak-password') {
          toast.error('Password is too weak.', { id: tid });
        } else {
          toast.error(error.message || 'Something went wrong.', { id: tid });
        }
      }
      setLoading(false);
    },
  });

  const switchTab = (register) => {
    if (register !== isRegistering || isForgotPassword) { 
      setIsRegistering(register); 
      setIsForgotPassword(false);
      formik.resetForm(); 
    }
  };

  /* ── Shared button style matching landing page ─────────── */
  const pillBtnStyle = {
    background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #0ea5e9 100%)',
    borderRadius: '999px',
    boxShadow: '0 0 20px rgba(37,99,235,0.35)',
    border: 'none',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    width: '100%',
    padding: '0.8rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.2s, transform 0.15s',
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#000000', fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ══════════════════════════════════════════
          LEFT PANEL — Branded dark panel
      ══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[44%] relative flex-col justify-between overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #00061a 0%, #000d2e 40%, #030b20 100%)',
        }}
      >
        {/* Wave decoration */}
        <WaveDecor />

        {/* Floating dots */}
        <Dot color="#2563eb" size={12} style={{ top: '18%', left: '15%', opacity: 0.85 }} />
        <Dot color="#0ea5e9" size={9}  style={{ top: '32%', right: '18%', opacity: 0.75 }} />
        <Dot color="#1d4ed8" size={14} style={{ top: '55%', left: '10%', opacity: 0.6 }} />
        <Dot color="#38bdf8" size={8}  style={{ bottom: '28%', right: '14%', opacity: 0.7 }} />
        <Dot color="#3b82f6" size={10} style={{ bottom: '15%', left: '25%', opacity: 0.65 }} />
        <Dot color="#60a5fa" size={6}  style={{ top: '72%', right: '28%', opacity: 0.6 }} />

        {/* Top: Logo */}
        <div className="relative z-10 p-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <img src="/coins/logo1.png" alt="Logo" className="h-16 w-auto object-contain" />
            <span style={{
              fontSize: '1.15rem', fontWeight: 700, color: 'white',
              fontFamily: "'Outfit', Inter, sans-serif", letterSpacing: '-0.01em'
            }}>
              GPT Platform
            </span>
          </button>
        </div>

        {/* Center: Hero text */}
        <div className="relative z-10 px-10 pb-4">
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            fontFamily: "'Outfit', Inter, sans-serif",
            marginBottom: '1rem',
          }}>
            <span style={{
              background: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 55%, #0ea5e9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Earn Real Rewards.
            </span>
            <br />
            <span className="text-white">Start Today.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '320px' }}>
            Complete simple tasks and surveys. Redeem points for Crypto, PayPal, Gift Cards, Discord Nitro & more.
          </p>
        </div>

        {/* Bottom: Testimonial / stat strip */}
        <div className="relative z-10 p-10 pt-0">
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            gap: '2rem',
          }}>
            {[['10K+', 'Active Users'], ['$500K+', 'Paid Out'], ['4.9★', 'Rating']].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', fontFamily: "'Outfit', sans-serif" }}>{val}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — Form
      ══════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center p-6 relative"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 80% 20%, rgba(3,15,60,0.5) 0%, #000000 60%)',
        }}
      >
        {/* Subtle top-right glow */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '360px', height: '360px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}
        >
          {/* Mobile logo */}
          <button
            onClick={() => navigate('/')}
            className="lg:hidden flex items-center gap-2 mb-8"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <img src="/coins/logo1.png" alt="Logo" className="h-16 w-auto object-contain" />
            <span style={{
              fontSize: '1.1rem', fontWeight: 700, color: 'white',
              fontFamily: "'Outfit', Inter, sans-serif",
            }}>
              GPT Platform
            </span>
          </button>

          {/* ── Tab switcher ── */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '999px',
            padding: '4px',
            marginBottom: '2rem',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {[['Sign Up', true], ['Sign In', false]].map(([label, isReg]) => (
              <button
                key={label}
                onClick={() => switchTab(isReg)}
                style={{
                  flex: 1,
                  padding: '0.55rem 1rem',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: isRegistering === isReg
                    ? 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #0ea5e9 100%)'
                    : 'transparent',
                  color: isRegistering === isReg ? 'white' : 'rgba(255,255,255,0.4)',
                  boxShadow: isRegistering === isReg ? '0 0 16px rgba(37,99,235,0.35)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Greeting ── */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{
              fontSize: '1.55rem', fontWeight: 800, color: 'white',
              fontFamily: "'Outfit', Inter, sans-serif", lineHeight: 1.2, marginBottom: '0.35rem',
            }}>
              {isForgotPassword ? 'Reset Password' : (isRegistering ? 'Create your account' : 'Welcome back')}
            </h1>
            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.35)' }}>
              {isForgotPassword
                ? 'Enter your email to receive a password reset link'
                : (isRegistering ? 'Sign up below or continue with Google' : 'Sign in below or continue with Google')}
            </p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={formik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Username — sign up only */}
            <AnimatePresence mode="popLayout">
              {isRegistering && !isForgotPassword && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Field name="displayName" type="text" label="USERNAME" placeholder="your_username"
                    icon={FiUser} formik={formik} loading={loading} />
                </motion.div>
              )}
            </AnimatePresence>

            <Field name="email" type="email" label="EMAIL ADDRESS" placeholder="you@email.com"
              icon={FiMail} formik={formik} loading={loading} />

            <AnimatePresence mode="popLayout">
              {!isForgotPassword && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Field
                    name="password" type="password" label="PASSWORD" placeholder="At least 8 characters"
                    icon={FiLock} formik={formik} loading={loading}
                    extra={!isRegistering && (
                      <button type="button"
                        onClick={() => { setIsForgotPassword(true); formik.resetForm(); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem',
                          color: 'rgba(37,99,235,0.9)', fontWeight: 600 }}>
                        Forgot Password?
                      </button>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password hints (sign up) */}
            <AnimatePresence>
              {isRegistering && !isForgotPassword && (
                <motion.div
                  key="hints"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '-4px' }}
                >
                  {[
                    { ok: formik.values.password.length >= 8,        text: 'At least 8 characters' },
                    { ok: /[0-9!@#$%^&*]/.test(formik.values.password), text: 'Contains a number or symbol' },
                  ].map(({ ok, text }) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: ok ? '#34d399' : 'rgba(255,255,255,0.2)' }}>
                        {ok ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: ok ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.25)' }}>
                        {text}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...pillBtnStyle,
                marginTop: '0.5rem',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.opacity = '0.92'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = loading ? '0.6' : '1'; }}
            >
              {loading ? 'Please wait...' : (isForgotPassword ? 'Send Reset Link' : (isRegistering ? 'Create Account' : 'Sign In'))}
              {!loading && <FiArrowRight size={15} />}
            </button>
          </form>

          {/* ── Divider ── */}
          {!isForgotPassword && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.4rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                or continue with
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </div>
          )}

          {/* ── Google button ── */}
          {!isForgotPassword && (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '0.75rem 1.5rem',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'white'; }}}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            >
              <FcGoogle size={18} />
              Continue with Google
            </button>
          )}

          {/* ── Bottom switch link ── */}
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>
            {isForgotPassword ? '' : (isRegistering ? 'Already have an account? ' : "Don't have an account? ")}
            <button
              type="button"
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                  formik.resetForm();
                } else {
                  switchTab(!isRegistering);
                }
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                background: 'linear-gradient(90deg, #2563eb, #0ea5e9)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', fontWeight: 600, fontSize: '0.82rem',
              }}
            >
              {isForgotPassword ? 'Back to sign in' : (isRegistering ? 'Sign in' : 'Sign up')}
            </button>
          </p>

          {/* Terms */}
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.18)', lineHeight: 1.5 }}>
            By continuing, you agree to our{' '}
            <span style={{ color: 'rgba(37,99,235,0.8)', cursor: 'pointer' }}>Terms of Use</span>
            {' '}&{' '}
            <span style={{ color: 'rgba(37,99,235,0.8)', cursor: 'pointer' }}>Privacy Policy</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
