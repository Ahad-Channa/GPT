import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';

const Login = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorPrompt, setErrorPrompt] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setErrorPrompt('');
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      setErrorPrompt('Google Login failed. Please check Configuration.');
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
        setErrorPrompt("Please fill in all fields.");
        return;
    }
    setErrorPrompt('');
    setMessage('');
    setLoading(true);
    
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
        setMessage('Registration successful! Please check your email to verify your account.');
      } else {
        await loginWithEmail(email, password);
        navigate('/');
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorPrompt('That email is already registered. Please log in.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErrorPrompt('Incorrect email or password.');
      } else {
        setErrorPrompt(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#08080c] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-900/10 to-violet-900/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md glass-card p-10 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,211,238,0.3)] mb-4">
            <span className="font-bold text-white text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            {isRegistering ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-slate-400 text-sm">
             Secure gateway to GPT
          </p>
        </div>

        {errorPrompt && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-sm flex items-center gap-3">
            <FiAlertCircle className="shrink-0 text-lg" />
            <p className="leading-tight">{errorPrompt}</p>
          </motion.div>
        )}

        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-4 text-sm flex items-center gap-3">
            <FiAlertCircle className="shrink-0 text-lg" />
            <p className="leading-tight">{message}</p>
          </motion.div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-5 mb-8">
            <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative group">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                        type="email" 
                        required
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:bg-white/[0.05] focus:border-cyan-500/50 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative group">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                        type="password"
                        required 
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:bg-white/[0.05] focus:border-cyan-500/50 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold py-4 px-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
                {loading ? 'Authenticating...' : (isRegistering ? 'Register Account' : 'Sign In')}
            </button>
        </form>

        <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Or integrate via</span>
            <div className="flex-1 h-px bg-white/10"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-semibold py-4 px-4 rounded-2xl hover:bg-white/10 transition-colors duration-300"
        >
          <FcGoogle className="text-xl" />
          Google Account
        </button>

        <div className="mt-8 text-center">
            <button 
               type="button"
               onClick={() => { setIsRegistering(!isRegistering); setErrorPrompt(''); setMessage(''); }}
               className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer text-sm font-medium"
            >
                {isRegistering ? "Return to Sign In" : "Need an account? Create one."}
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
