import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiLock, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

/* ─── Floating dots ─────────────────────────────────────────── */
const Dot = ({ style, color, size = 8 }) => (
  <div className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, background: color, filter: 'blur(0.5px)', ...style }} />
);

/* ─── Input Field Component ─────────────────────────────────── */
const Field = ({ label, name, type, placeholder, icon: Icon, formik, loading }) => {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  const hasErr = formik.touched[name] && formik.errors[name];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
          {label}
        </label>
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

const ResetPassword = () => {
  const { confirmResetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState(null);

  useEffect(() => {
    // Firebase includes an 'oobCode' in the URL when redirecting to the reset page
    const code = searchParams.get('oobCode');
    if (code) {
      setOobCode(code);
    } else {
      toast.error('Invalid password reset link.');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .min(8, 'At least 8 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm Password is required'),
  });

  const formik = useFormik({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: async (values) => {
      if (!oobCode) return;
      setLoading(true);
      const tid = toast.loading('Resetting password...');
      try {
        await confirmResetPassword(oobCode, values.password);
        toast.success('Password successfully reset! You can now log in.', { id: tid });
        navigate('/login');
      } catch (error) {
        if (error.code === 'auth/expired-action-code') {
          toast.error('This reset link has expired. Please request a new one.', { id: tid });
        } else if (error.code === 'auth/invalid-action-code') {
          toast.error('Invalid reset link. It may have already been used.', { id: tid });
        } else {
          toast.error(error.message || 'Something went wrong.', { id: tid });
        }
      }
      setLoading(false);
    },
  });

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
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(3,15,60,0.5) 0%, #000000 60%)',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}
    >
      <div style={{
        position: 'absolute', top: '10%', right: '20%',
        width: '360px', height: '360px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-8 mx-auto"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span style={{
            fontSize: '1.25rem', fontWeight: 700, color: 'white',
            fontFamily: "'Outfit', Inter, sans-serif",
          }}>
            GPT Platform
          </span>
        </button>

        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '1.55rem', fontWeight: 800, color: 'white',
            fontFamily: "'Outfit', Inter, sans-serif", lineHeight: 1.2, marginBottom: '0.35rem',
          }}>
            Set New Password
          </h1>
          <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.35)' }}>
            Please enter your new password below.
          </p>
        </div>

        <form onSubmit={formik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field
            name="password" type="password" label="NEW PASSWORD" placeholder="At least 8 characters"
            icon={FiLock} formik={formik} loading={loading}
          />
          <Field
            name="confirmPassword" type="password" label="CONFIRM PASSWORD" placeholder="Re-enter password"
            icon={FiLock} formik={formik} loading={loading}
          />

          <button
            type="submit"
            disabled={loading || !oobCode}
            style={{
              ...pillBtnStyle,
              marginTop: '0.5rem',
              opacity: loading || !oobCode ? 0.6 : 1,
              cursor: loading || !oobCode ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!loading && oobCode) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.opacity = '0.92'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = loading || !oobCode ? '0.6' : '1'; }}
          >
            {loading ? 'Saving...' : 'Reset Password'}
            {!loading && <FiArrowRight size={15} />}
          </button>
        </form>

      </motion.div>
    </div>
  );
};

export default ResetPassword;
