import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiUser, FiArrowRight, FiEye, FiEyeOff, FiMenu, FiX } from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaYoutube, FaDiscord } from 'react-icons/fa';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Input Field Component ─────────────────────────────────── */
const Field = ({ label, name, type, placeholder, icon, formik, loading, extra }) => {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  const hasErr = formik.touched[name] && formik.errors[name];
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label
          style={{
            height: '20px',
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 500,
            fontSize: '16px',
            lineHeight: '20px',
            letterSpacing: '-0.01em',
            color: 'rgba(255, 255, 255, 1)',
            verticalAlign: 'middle',
            margin: 0,
            display: 'inline-block',
          }}
        >
          {label}
        </label>
        {extra}
      </div>
      <div
        className="flex items-center relative"
        style={{
          width: '100%',
          height: '56px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.08)',
          padding: '16px 20px',
          gap: '12px',
          border: hasErr ? '1px solid rgba(248,113,113,0.5)' : '1px solid transparent',
          transition: 'all 0.2s',
        }}
      >
        <img
          src={icon}
          alt={name}
          style={{
            width: '24px',
            height: '24px',
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
        <input
          type={isPass && show ? 'text' : type}
          name={name}
          placeholder={placeholder}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          disabled={loading}
          className="w-full bg-transparent border-none outline-none focus:outline-none placeholder-[rgba(137,141,143,1)]"
          style={{
            height: '24px',
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 500,
            fontSize: '18px',
            lineHeight: '20px',
            letterSpacing: '0%',
            verticalAlign: 'middle',
            color: 'rgba(255, 255, 255, 1)',
            padding: 0,
            margin: 0,
            flex: 1,
            minWidth: 0,
          }}
        />
        {isPass && (
          <button type="button" tabIndex={-1}
            onClick={() => setShow(s => !s)}
            style={{
              width: '24px',
              height: '24px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(137, 141, 143, 1)',
              flexShrink: 0,
            }}
            className="hover:text-[#A1A1AA] transition-colors"
          >
            <img 
              src="/coins/evy.png" 
              alt={show ? "hide" : "show"} 
              style={{ 
                width: '24px', 
                height: '24px', 
                opacity: show ? 0.5 : 1,
                objectFit: 'contain',
              }} 
            />
          </button>
        )}
      </div>
      {hasErr && <p className="text-[#f87171] text-xs mt-1 font-['Barlow']">{formik.errors[name]}</p>}
    </div>
  );
};

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
      terms: Yup.boolean().oneOf([true], 'You must accept the terms and conditions'),
    }),
  });

  const formik = useFormik({
    initialValues: { displayName: '', email: '', password: '', terms: false },
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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-[#29FD98] selection:text-black">
      
      {/* NAVBAR */}
      <nav className="w-full absolute top-0 left-0 right-0 z-50 py-2 lg:py-6 px-2 md:px-8 flex justify-between items-center max-w-7xl mx-auto h-[44px] lg:h-[106px]">
        {/* Logo */}
        <div className="flex items-center gap-1 lg:gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/coins/logo copy.png"
            alt="Logo"
            className="w-[22px] h-[22px] lg:w-[54px] lg:h-[54px] object-contain"
          />
          <span
            className="font-bold tracking-tight text-white flex items-center text-[14px] lg:text-[28px]"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              lineHeight: '30.15px'
            }}
          >
            TaskMint
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-[6px] sm:gap-[10px] lg:gap-8 font-['Barlow_Condensed'] font-semibold text-[10px] sm:text-[14px] lg:text-[22px] leading-none tracking-normal text-white">
          <a href="/#" className="hover:text-[#29FD98] transition-colors">Home</a>
          <a href="/#earn" className="hover:text-[#29FD98] transition-colors">Earn</a>
          <a href="/#how-it-works" className="hover:text-[#29FD98] transition-colors whitespace-nowrap">How it Works</a>
          <a href="/#features" className="hover:text-[#29FD98] transition-colors">Features</a>
          <a href="/#faq" className="hover:text-[#29FD98] transition-colors">FAQ</a>
        </div>

        {/* Right Actions */}
        <div
          className="flex items-center justify-end w-auto lg:w-[282px] h-[22px] lg:h-[48px] gap-[4px] lg:gap-[10px]"
        >
          <div
            className="flex sm:flex items-center justify-center cursor-pointer text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none lg:w-[104px] lg:h-[48px] h-[22px] px-1 lg:px-[14px] rounded-[6px] lg:rounded-[10px] gap-1 lg:gap-[8px]"
            style={{
              background: 'rgba(39, 112, 58, 1)',
              boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)'
            }}
          >
            <img src="/coins/globe.png" alt="Lang" className="w-[8px] h-[8px] lg:w-5 lg:h-5 object-contain" />
            <span className="font-['Barlow_Condensed'] font-semibold text-[8px] lg:text-[18px] leading-none tracking-normal">
              Eng
            </span>
            <img src="/coins/arrow.png" alt="Arrow" className="w-2 h-2 lg:w-3 lg:h-3 object-contain" />
          </div>
          <button
            onClick={() => switchTab(true)}
            className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none w-[50px] sm:w-[70px] lg:w-[168px] h-[22px] lg:h-[48px] px-1 lg:px-6 gap-[2px] lg:gap-[10px] rounded-[6px] lg:rounded-[10px]"
            style={{
              background: 'rgba(73, 178, 101, 1)',
              boxShadow: '0px 4px 0px 0px rgba(45, 110, 62, 1)'
            }}
          >
            <span className="font-['Barlow_Condensed'] font-bold text-[8px] sm:text-[10px] lg:text-[18px] leading-none tracking-normal whitespace-nowrap">
              Get Started
            </span>
            <div
              className="bg-white w-[6px] h-[6px] lg:w-[18px] lg:h-[18px] hidden sm:block"
              style={{
                WebkitMaskImage: 'url(/coins/image.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: 'url(/coins/image.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center'
              }}
            />
          </button>
        </div>
      </nav>



      {/* Header Bottom Line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-40 top-[44px] lg:top-[106px]"
        style={{
          width: '100%',
          maxWidth: 1240,
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
        }}
      />

      {/* LOGIN/REGISTER FORM SECTION */}
      <section className="pt-[195px] pb-[100px] flex items-center justify-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
          style={{
            width: '600px',
            background: 'rgba(26, 27, 26, 1)',
            backdropFilter: 'blur(104px)',
            WebkitBackdropFilter: 'blur(104px)',
            borderRadius: '24px',
            padding: '40px',
            gap: '30px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Greeting */}
          <div
            className="flex flex-col items-center justify-center mx-auto"
            style={{
              width: '520px',
              maxWidth: '100%',
              height: '70px',
              gap: '16px',
            }}
          >
            <h1
              style={{
                width: '100%',
                maxWidth: '520px',
                height: '32px',
                margin: 0,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: '42px',
                lineHeight: '32px',
                letterSpacing: '0%',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 1)',
              }}
            >
              {isForgotPassword ? 'Forgot Password' : (isRegistering ? 'Create Your Account' : 'Login Your Account')}
            </h1>
            <p
              style={{
                width: '100%',
                maxWidth: '520px',
                height: '22px',
                margin: 0,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 500,
                fontSize: '20px',
                lineHeight: '22px',
                letterSpacing: '-0.01em',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              {isForgotPassword
                ? 'Enter your registered email to get verification code'
                : (isRegistering ? 'Create your account to access all features' : 'Login into your account to access all features')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={formik.handleSubmit} className="flex flex-col items-center w-full" style={{ gap: '24px' }}>
            {/* Fields Container */}
            <div
              className="flex flex-col mx-auto w-full"
              style={{
                width: '520px',
                maxWidth: '100%',
                gap: '12px',
              }}
            >
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
                  <Field name="displayName" type="text" label="Username" placeholder="Emmy"
                    icon="/coins/pelogin.png" formik={formik} loading={loading} />
                </motion.div>
              )}
            </AnimatePresence>

            <Field name="email" type="email" label="Email" placeholder="emmy@gmail.com"
              icon="/coins/sms.png" formik={formik} loading={loading} />

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
                    name="password" type="password" label="Password" placeholder="Your password"
                    icon="/coins/lockpe.png" formik={formik} loading={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </div>

            {/* Checkbox for Register */}
            <AnimatePresence mode="popLayout">
              {isRegistering && !isForgotPassword && (
                <motion.div
                  key="terms"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="flex items-center w-full mt-1 mb-2"
                    style={{
                      width: '520px',
                      maxWidth: '100%',
                      height: '26px',
                      gap: '10px',
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        id="terms"
                        name="terms"
                        onChange={formik.handleChange}
                        checked={formik.values.terms}
                        className="appearance-none bg-transparent checked:bg-[rgba(73,178,101,1)] cursor-pointer transition-colors m-0"
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          border: '2px solid rgba(73, 178, 101, 1)',
                          flexShrink: 0,
                        }}
                      />
                      {formik.values.terms && (
                        <svg className="absolute w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <label 
                      htmlFor="terms" 
                      className="cursor-pointer text-[#A1A1AA]"
                      style={{
                        width: '439px',
                        maxWidth: '100%',
                        height: '20px',
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        lineHeight: '20px',
                        letterSpacing: '0%',
                        verticalAlign: 'middle',
                        margin: 0,
                      }}
                    >
                      By signing up, you agree to our <span className="text-[rgba(73,178,101,1)]">Terms and Conditions</span> & <span className="text-[rgba(73,178,101,1)]">Privacy Policy</span>.
                    </label>
                  </div>
                  {formik.touched.terms && formik.errors.terms && (
                    <p className="text-[#f87171] text-xs mt-1 font-['Barlow']">{formik.errors.terms}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forgot Password Link for Login */}
            <AnimatePresence mode="popLayout">
              {!isRegistering && !isForgotPassword && (
                <motion.div
                  key="forgot-password"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div 
                    className="flex items-center justify-center w-full mx-auto m-0"
                    style={{
                      width: '520px',
                      maxWidth: '100%',
                      height: '24px',
                      gap: '4px'
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        lineHeight: '22px',
                        letterSpacing: '-0.01em',
                        verticalAlign: 'middle',
                        color: 'rgba(255, 255, 255, 1)'
                      }}
                    >
                      Don't Remember Your Password?
                    </span>
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); formik.resetForm(); }}
                      className="bg-transparent border-none p-0 cursor-pointer hover:brightness-110 transition-all"
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        lineHeight: '22px',
                        letterSpacing: '-0.01em',
                        verticalAlign: 'middle',
                        color: 'rgba(73,178,101,1)'
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none border-none cursor-pointer"
              style={{
                width: '520px',
                maxWidth: '100%',
                height: '48px',
                borderRadius: '10px',
                padding: '10px 30px',
                gap: '10px',
                background: 'rgba(73, 178, 101, 1)',
                boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <span
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  lineHeight: '100%',
                  letterSpacing: '0.02em',
                  color: 'rgba(255, 255, 255, 1)',
                  margin: 0,
                }}
              >
                {loading ? 'Please wait...' : (isForgotPassword ? 'Send Reset Link' : (isRegistering ? 'Sign Up' : 'Login'))}
              </span>
              {!loading && (
                <div
                  className="bg-white"
                  style={{
                    width: '24px',
                    height: '24px',
                    WebkitMaskImage: 'url(/coins/image.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: 'url(/coins/image.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
              )}
            </button>
          </form>

          {/* Divider */}
          {!isForgotPassword && (
            <div 
              className="flex items-center mx-auto" 
              style={{
                width: '520px',
                maxWidth: '100%',
                height: '18px',
                gap: '10px'
              }}
            >
              <div className="h-px bg-[#333] flex-1"></div>
              <span 
                style={{
                  width: '10px',
                  height: '18px',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '18px',
                  letterSpacing: '-0.01em',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 1)',
                  display: 'inline-block'
                }}
              >
                or
              </span>
              <div className="h-px bg-[#333] flex-1"></div>
            </div>
          )}

          {/* Google Button */}
          {!isForgotPassword && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none border-none cursor-pointer"
              style={{
                width: '520px',
                maxWidth: '100%',
                height: '48px',
                borderRadius: '10px',
                padding: '10px 30px',
                gap: '10px',
                background: 'rgba(39, 112, 58, 1)',
                boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <img 
                src="/coins/gogle.png" 
                alt="Google" 
                style={{
                  width: '20px',
                  height: '20px',
                  objectFit: 'contain'
                }}
              />
              <span
                style={{
                  width: '114px',
                  height: '18px',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  color: 'rgba(255, 255, 255, 1)',
                  margin: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                Continue with Google
              </span>
            </button>
          )}

          {/* Bottom Switch Link */}
          <p 
            className="text-center mx-auto m-0"
            style={{
              height: '22px',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 500,
              fontSize: '18px',
              lineHeight: '22px',
              letterSpacing: '-0.01em',
              verticalAlign: 'middle',
              color: 'rgba(255, 255, 255, 1)'
            }}
          >
            {isForgotPassword ? 'Back to ' : (isRegistering ? 'Already Have an Account? ' : "Don't Have an Account? ")}
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
              className="bg-transparent border-none p-0 cursor-pointer hover:brightness-110 transition-all"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 600,
                fontSize: '18px',
                color: 'rgba(73,178,101,1)'
              }}
            >
              {isForgotPassword ? 'Login Now' : (isRegistering ? 'Login Now' : 'Register Now')}
            </button>
          </p>
        </motion.div>
      </section>

      {/* BOTTOM CTA */}
      <section
        className="w-full flex justify-center mt-12"
        style={{ background: 'rgba(27, 28, 27, 1)' }}
      >
        <div
          className="flex flex-col md:flex-row items-center justify-between w-full"
          style={{
            width: 1440,
            maxWidth: '100%',
            height: 158,
            padding: '40px 100px',
            justifyContent: 'space-between'
          }}
        >
          <div
            className="flex flex-col justify-start"
            style={{ width: 1072, height: 78, gap: 30 }}
          >
            <h2
              className="m-0 whitespace-nowrap flex items-center"
              style={{
                width: 341,
                height: 34,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 48,
                lineHeight: '48px',
                color: 'rgba(255, 255, 255, 1)'
              }}
            >
              Start Earning Today
            </h2>
            <p
              className="m-0 whitespace-nowrap flex items-center"
              style={{
                width: 1072,
                maxWidth: '100%',
                height: 14,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 500,
                fontSize: 20,
                lineHeight: '28px',
                color: 'rgba(255, 255, 255, 0.53)'
              }}
            >
              Join now and start making real money right now!
            </p>
          </div>
          <button
            onClick={() => switchTab(true)}
            className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none border-none cursor-pointer"
            style={{
              width: 168,
              height: 48,
              borderRadius: 10,
              padding: '10px 30px',
              gap: 10,
              background: 'rgba(73, 178, 101, 1)',
              boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)'
            }}
          >
            <span
              className="whitespace-nowrap flex items-center justify-center m-0 p-0"
              style={{
                width: 74,
                height: 13,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontStyle: 'normal',
                fontSize: 18,
                lineHeight: '100%',
                letterSpacing: '0%'
              }}
            >
              Get Started
            </span>
            <div
              className="bg-white"
              style={{
                width: 18,
                height: 18,
                WebkitMaskImage: 'url(/coins/image.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: 'url(/coins/image.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center'
              }}
            />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="w-full flex justify-center border-t border-[#333]"
        style={{ background: 'rgba(44, 45, 44, 1)' }}
      >
        <div
          className="flex flex-col items-center text-center w-full mx-auto"
          style={{
            width: 1440,
            maxWidth: '100%',
            height: 266.9997863769531,
            paddingTop: 40,
            paddingRight: 100,
            paddingBottom: 22,
            paddingLeft: 100,
            gap: 30,
            opacity: 1,
            transform: 'rotate(0deg)',
            justifyContent: 'space-between'
          }}
        >
          {/* Top Logo */}
          <div
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
            style={{
              width: 210.99978637695312,
              height: 51.999786376953125,
              gap: 10,
              opacity: 1,
              transform: 'rotate(0deg)'
            }}
          >
            <img
              src="/coins/logo copy.png"
              alt="Logo"
              style={{
                width: 51.999786376953125,
                height: 51.999786376953125,
                objectFit: 'contain',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            />
            <span
              className="whitespace-nowrap flex items-center"
              style={{
                width: 149,
                height: 32,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 46,
                lineHeight: '100%',
                letterSpacing: '0%',
                color: 'rgba(255, 255, 255, 1)',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            >
              TaskMint
            </span>
          </div>

          {/* Middle Content */}
          <div
            className="flex flex-col items-center text-center w-full max-w-[1104px] gap-4 lg:gap-[30px]"
          >
            <p
              className="m-0 p-0 flex items-center justify-center whitespace-normal lg:whitespace-nowrap px-4 lg:px-0"
              style={{
                height: 'auto',
                minHeight: 14,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 20,
                lineHeight: '28px',
                textAlign: 'center',
                color: 'rgba(209, 213, 219, 1)'
              }}
            >
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>
            <div
              className="flex justify-center items-center m-0 p-0 flex-wrap lg:flex-nowrap gap-x-4 gap-y-2 lg:gap-[20px] w-full px-4 lg:px-0"
            >
              {[
                { name: 'Features', href: '/#features' },
                { name: 'FAQ', href: '/#faq' },
                { name: 'Blog', href: '#' },
                { name: 'Terms of Use', href: '#' },
                { name: 'Privacy Policy', href: '#' },
                { name: 'Support', href: '#' }
              ].map((link, idx, arr) => (
                <React.Fragment key={link.name}>
                  <a
                    href={link.href}
                    className="hover:opacity-80 transition-opacity whitespace-nowrap flex items-center justify-center"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: 16,
                      color: 'rgba(73, 178, 101, 1)',
                      textDecoration: 'none'
                    }}
                  >
                    {link.name}
                  </a>
                  {idx < arr.length - 1 && (
                    <span
                      className="hidden lg:flex items-center justify-center"
                      style={{ color: '#fff', fontSize: 16 }}
                    >
                      &bull;
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom Divider & Copyright */}
          <div className="w-full flex flex-col items-center gap-4 mt-6 lg:mt-0 px-4 lg:px-0">
            <div
              className="w-full border-t border-white/30"
              style={{ maxWidth: 1240 }}
            />
            <div
              className="flex flex-col-reverse lg:flex-row items-center justify-between w-full gap-4 lg:gap-0 pb-4 lg:pb-0"
              style={{ maxWidth: 1240 }}
            >
              <p
                className="m-0 p-0 flex items-center text-center lg:text-left"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  color: 'rgba(255, 255, 255, 1)'
                }}
              >
                © 2026 TaskMint. All rights reserved.
              </p>
              <div
                className="flex items-center justify-center lg:justify-between gap-4 lg:gap-[20px]"
                style={{
                  color: 'rgba(73, 178, 101, 1)'
                }}
              >
                <FaFacebook className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26 }} />
                <FaInstagram className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26 }} />
                <FaYoutube className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26 }} />
                <FaDiscord className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26 }} />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
