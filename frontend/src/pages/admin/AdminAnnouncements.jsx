import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiMessageSquare, FiSend, FiBell } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminAnnouncements = () => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }

    if (!window.confirm("Are you sure you want to send this announcement to ALL users?")) {
      return;
    }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetAll: true
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Global announcement sent successfully!");
        setTitle('');
        setMessage('');
      } else {
        toast.error(data.error || 'Failed to send announcement');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiBell style={{ color: '#2563EB' }} />
            Global Announcements
          </h1>
          <p className="admin-page-sub">Send a broadcast notification to every user on the platform.</p>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: '640px' }}>
        <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0E0F0C', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '1.15rem' }}>
          <FiMessageSquare style={{ color: '#2563EB' }} />
          Compose Message
        </h3>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', color: '#4B5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notification Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Platform Update, Special Event!"
              className="admin-input"
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', color: '#4B5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement details here..."
              className="admin-input"
              rows={5}
              style={{ resize: 'vertical' }}
              required
            />
          </div>

          <button 
            type="submit" 
            className="admin-btn-primary" 
            disabled={loading}
            style={{ alignSelf: 'flex-start', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FiSend />
            {loading ? 'Sending...' : 'Broadcast to All Users'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#1E40AF', lineHeight: '1.5' }}>
            <strong>Note:</strong> This will create a push notification in the notification feed for <em>every</em> user. Use this feature sparingly to prevent notification fatigue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;

