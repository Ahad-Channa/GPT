import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiMail, FiCheck, FiSave, FiAlertCircle, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminSupportEmail = () => {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSupportEmail();
  }, []);

  const fetchSupportEmail = async () => {
    try {
      setLoading(true);
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/admin/support-email`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && data.supportEmail) {
        setEmail(data.supportEmail);
        setCurrentEmail(data.supportEmail);
      }
    } catch (err) {
      console.error('Failed to load support email', err);
      toast.error('Failed to load support email');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/admin/support-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ supportEmail: cleanEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentEmail(data.supportEmail);
        setEmail(data.supportEmail);
        toast.success(data.message || 'Support email updated successfully');
      } else {
        toast.error(data.error || 'Failed to update support email');
      }
    } catch (err) {
      console.error('Failed to save support email', err);
      toast.error('Network error saving support email');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <FiMail className="w-6 h-6 text-[#00D65D]" />
          Support Email
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure the public contact and ban appeal email shown to suspended users in the account suspension popup.
        </p>
      </div>

      {loading ? (
        <div className="bg-[#1B1E22] border border-white/5 rounded-2xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#00D65D] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading support email configuration...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-[#1B1E22] border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-bold text-white">Contact & Appeal Email</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  This email is displayed directly in the banned account modal.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00D65D]/10 text-[#00D65D] border border-[#00D65D]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D65D] animate-pulse" />
                Active
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Support Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. support@taskmint.me"
                    className="w-full bg-[#121417] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00D65D] transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Make sure this email inbox is actively monitored to respond to user ban appeals.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setEmail(currentEmail)}
                  disabled={saving || email === currentEmail}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={saving || !email.trim() || email.trim().toLowerCase() === currentEmail.toLowerCase()}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-[#00D65D] hover:bg-[#00BD52] text-black transition-all flex items-center gap-2 shadow-lg shadow-[#00D65D]/10 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      Save Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Card */}
          <div className="bg-[#1B1E22] border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FiInfo className="w-4 h-4 text-blue-400" />
              Live Popup Preview
            </h3>
            <p className="text-xs text-gray-400">
              Suspended users will see this exact non-clickable badge when attempting to log in:
            </p>

            {/* Mock banned popup button */}
            <div className="p-4 rounded-xl bg-[#0f1115] border border-red-500/20 space-y-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Account Suspended Button:
              </div>
              <div
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-red-600 text-white flex items-center justify-center gap-2 shadow-md shadow-red-600/20 select-all cursor-default"
                title="Support Email"
              >
                <FiMail className="w-4 h-4 shrink-0" />
                <span className="truncate">{email.trim() || currentEmail || 'support@taskmint.me'}</span>
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                (Non-clickable, allows user copying)
              </p>
            </div>

            <div className="rounded-xl p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed space-y-1">
              <span className="font-semibold block text-blue-200">How it works:</span>
              <span>
                Any changes made here take effect immediately for all banned users without needing server restarts or redeploys.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportEmail;

